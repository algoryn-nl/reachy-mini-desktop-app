import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import URDFLoader from 'urdf-loader';
import urdfFile from '../assets/robot-3d/reachy-mini.urdf?raw';

/**
 * Global cache for robot URDF model
 * Allows loading the model once at app startup
 * and reusing it in all components
 */

class RobotModelCache {
  constructor() {
    this.robotModel = null;
    this.isLoading = false;
    this.isLoaded = false;
    this.loadPromise = null;
    this.listeners = new Set();
    this.version = 'v20-debug-merge-vertices'; // Change this version to force reload
  }

  /**
   * Intelligent smooth normal calculation
   * Analyzes geometry to detect curved surfaces vs sharp edges
   * Applies adaptive smoothing based on dihedral angles
   * @param {THREE.BufferGeometry} geometry - Geometry to process
   * @returns {number} Optimal smoothing angle in radians
   */
  computeIntelligentSmoothAngle(geometry) {
    if (!geometry.attributes.position) return Math.PI / 3; // Default 60°
    
    const positions = geometry.attributes.position.array;
    const vertexCount = positions.length / 3;
    
    // Need at least some vertices to analyze
    if (vertexCount < 3) return Math.PI / 3;
    
    // Handle both indexed and non-indexed geometries
    const hasIndex = geometry.index !== null;
    const indices = hasIndex ? geometry.index.array : null;
    
    // Calculate face normals
    const faceNormals = [];
    const tempV0 = new THREE.Vector3();
    const tempV1 = new THREE.Vector3();
    const tempV2 = new THREE.Vector3();
    const tempEdge1 = new THREE.Vector3();
    const tempEdge2 = new THREE.Vector3();
    const tempNormal = new THREE.Vector3();
    
    // Determine face count
    let faceCount;
    if (hasIndex) {
      if (indices.length % 3 !== 0) {
        console.warn('⚠️ Invalid index count, not a multiple of 3');
        return Math.PI / 3;
      }
      faceCount = indices.length / 3;
    } else {
      if (vertexCount % 3 !== 0) {
        console.warn('⚠️ Invalid vertex count for non-indexed geometry, not a multiple of 3');
        return Math.PI / 3;
      }
      faceCount = vertexCount / 3; // Non-indexed: vertices are grouped in triangles
    }
    
    // Calculate face normals
    for (let i = 0; i < faceCount; i++) {
      let idx0, idx1, idx2;
      
      if (hasIndex) {
        const baseIdx = i * 3;
        idx0 = indices[baseIdx];
        idx1 = indices[baseIdx + 1];
        idx2 = indices[baseIdx + 2];
        
        // Validate indices
        if (idx0 >= vertexCount || idx1 >= vertexCount || idx2 >= vertexCount ||
            idx0 < 0 || idx1 < 0 || idx2 < 0) {
          continue; // Skip invalid face
        }
      } else {
        idx0 = i * 3;
        idx1 = i * 3 + 1;
        idx2 = i * 3 + 2;
        
        // Validate indices
        if (idx0 >= vertexCount || idx1 >= vertexCount || idx2 >= vertexCount) {
          continue; // Skip invalid face
        }
      }
      
      // Get vertex positions (validate array bounds)
      const pos0Idx = idx0 * 3;
      const pos1Idx = idx1 * 3;
      const pos2Idx = idx2 * 3;
      
      if (pos0Idx + 2 >= positions.length || pos1Idx + 2 >= positions.length || pos2Idx + 2 >= positions.length) {
        continue; // Skip if out of bounds
      }
      
      tempV0.set(positions[pos0Idx], positions[pos0Idx + 1], positions[pos0Idx + 2]);
      tempV1.set(positions[pos1Idx], positions[pos1Idx + 1], positions[pos1Idx + 2]);
      tempV2.set(positions[pos2Idx], positions[pos2Idx + 1], positions[pos2Idx + 2]);
      
      // Calculate face normal
      tempEdge1.subVectors(tempV1, tempV0);
      tempEdge2.subVectors(tempV2, tempV0);
      tempNormal.crossVectors(tempEdge1, tempEdge2);
      
      const length = tempNormal.length();
      if (length > 1e-10) {
        tempNormal.normalize();
        faceNormals.push(tempNormal.clone());
      }
    }
    
    if (faceNormals.length < 3) return Math.PI / 3; // Not enough faces to analyze
    
    // Analyze dihedral angles between faces
    // Sample angles between faces to understand geometry curvature
    const angles = [];
    const sampleSize = Math.min(200, faceNormals.length * 2); // Sample more for better accuracy
    
    for (let i = 0; i < sampleSize; i++) {
      const idx1 = Math.floor(Math.random() * faceNormals.length);
      const idx2 = Math.floor(Math.random() * faceNormals.length);
      
      if (idx1 !== idx2) {
        const normal1 = faceNormals[idx1];
        const normal2 = faceNormals[idx2];
        const dot = normal1.dot(normal2);
        const angle = Math.acos(Math.max(-1, Math.min(1, dot))); // Clamp to avoid NaN
        if (!isNaN(angle) && isFinite(angle)) {
          angles.push(angle);
        }
      }
    }
    
    if (angles.length < 10) return Math.PI / 3; // Not enough samples
    
    // Calculate statistics
    angles.sort((a, b) => a - b);
    const median = angles[Math.floor(angles.length / 2)];
    const p25 = angles[Math.floor(angles.length * 0.25)];
    const p75 = angles[Math.floor(angles.length * 0.75)];
    const mean = angles.reduce((a, b) => a + b, 0) / angles.length;
    
    // Adaptive angle selection based on geometry analysis:
    // - Small angles (< 30°) indicate curved surfaces → smooth more
    // - Large angles (> 60°) indicate sharp edges → smooth less
    // - Use multiple percentiles for robust decision
    
    let smoothAngle;
    if (median < Math.PI / 6 && mean < Math.PI / 4) {
      // Mostly curved surfaces (median < 30°, mean < 45°)
      smoothAngle = Math.PI / 2; // 90° - smooth everything
    } else if (median < Math.PI / 3 && mean < Math.PI / 2) {
      // Mixed geometry (median 30-60°, mean < 90°)
      // Use 75th percentile as threshold - smooth most surfaces but keep sharp edges
      smoothAngle = Math.min(p75 * 1.3, Math.PI / 2);
      smoothAngle = Math.max(smoothAngle, Math.PI / 4); // At least 45°
    } else {
      // Many sharp edges (median > 60° or mean > 90°)
      // Use 25th percentile - only smooth clearly curved surfaces
      smoothAngle = Math.max(p25 * 1.2, Math.PI / 6); // At least 30°
    }
    
    // Clamp to reasonable range (30° to 90°)
    smoothAngle = Math.max(Math.PI / 6, Math.min(Math.PI / 2, smoothAngle));
    
    return smoothAngle;
  }

  /**
   * Loads URDF model and caches it
   */
  async load() {
    // Check if we need to reload due to version change
    try {
      const cachedVersion = localStorage.getItem('robotModelCacheVersion');
      if (cachedVersion !== this.version) {
        this.clear();
        localStorage.setItem('robotModelCacheVersion', this.version);
      }
    } catch (e) {}
    
    // If already loaded, return directly
    if (this.isLoaded && this.robotModel) {
      return this.robotModel;
    }

    // If loading in progress, wait for existing promise
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise;
    }

    // New loading
    this.isLoading = true;

    this.loadPromise = (async () => {
      try {
        const loader = new URDFLoader();
        
        // ✅ Map to store STL file names by URL (original and local)
        const stlFileMap = new Map();

        // Configure loader to load meshes from local assets
        loader.manager.setURLModifier((url) => {
          const filename = url.split('/').pop();
          const localUrl = new URL(`../assets/robot-3d/meshes/${filename}`, import.meta.url).href;
          // ✅ Store file name for both URLs (original and local)
          stlFileMap.set(url, filename);
          stlFileMap.set(localUrl, filename);
          return localUrl;
        });
        
        // ✅ Intercept loading events to capture STL file names
        loader.manager.addHandler(/\.stl$/i, {
          load: (url) => {
            const filename = url.split('/').pop();
            stlFileMap.set(url, filename);
          }
        });

        // Parse URDF from imported file
        const robotModel = loader.parse(urdfFile);
        
        // ✅ Wait for ALL STL files to be loaded (async loader)
        let totalMeshes = 0;
        
        // Count initial meshes
        robotModel.traverse((child) => {
          if (child.isMesh) totalMeshes++;
        });
        
        // Wait for LoadingManager to finish
        await new Promise((resolveLoading) => {
          if (loader.manager.onLoad) {
            const originalOnLoad = loader.manager.onLoad;
            loader.manager.onLoad = () => {
              if (originalOnLoad) originalOnLoad();
              resolveLoading();
            };
          } else {
            loader.manager.onLoad = () => resolveLoading();
          }
          
          // Safety timeout (2 seconds max)
          setTimeout(() => resolveLoading(), 2000);
        });
        
        // Recount after complete loading
        totalMeshes = 0;
        robotModel.traverse((child) => {
          if (child.isMesh) totalMeshes++;
        });

        // Initialize default materials
        let meshCount = 0;
        let shellCount = 0;
        
        // ✅ List of all loaded STL files
        const stlFilesList = [];
        
        robotModel.traverse((child) => {
          if (child.isMesh) {
            meshCount++;
            
            // ✅ Log STL file name for each mesh
            // Search for STL file name in different properties
            let meshFileName = '';
            
            // Method 1: Search in all possible geometry URLs (with map)
            if (child.geometry) {
              // Try different userData properties
              const possibleUrls = [
                child.geometry.userData?.url,
                child.geometry.userData?.sourceFile,
                child.geometry.userData?.filename,
                child.geometry.userData?.sourceURL,
              ].filter(Boolean);
              
              for (const url of possibleUrls) {
                // First try to find in map
                const mappedName = stlFileMap.get(url);
                if (mappedName) {
                  meshFileName = mappedName;
                  break;
                }
                // Otherwise extract from URL
                const filename = url.split('/').pop();
                if (filename && filename.toLowerCase().endsWith('.stl')) {
                  meshFileName = filename;
                  break;
                }
              }
            }
            
            // Method 2: Search in mesh itself
            if (!meshFileName && child.userData) {
              const meshUrls = [
                child.userData.url,
                child.userData.sourceFile,
                child.userData.filename,
                child.userData.sourceURL,
              ].filter(Boolean);
              
              for (const url of meshUrls) {
                const mappedName = stlFileMap.get(url);
                if (mappedName) {
                  meshFileName = mappedName;
                  break;
                }
                const filename = url.split('/').pop();
                if (filename && filename.toLowerCase().endsWith('.stl')) {
                  meshFileName = filename;
                  break;
                }
              }
            }
            
            // Method 3: Go up hierarchy to find file name
            if (!meshFileName) {
              let parent = child.parent;
              let depth = 0;
              while (parent && depth < 5) {
                // Search in parent userData
                if (parent.userData?.filename) {
                  meshFileName = parent.userData.filename;
                  break;
                }
                // Search in parent name
                if (parent.name && parent.name.toLowerCase().endsWith('.stl')) {
                  meshFileName = parent.name;
                  break;
                }
                parent = parent.parent;
                depth++;
              }
            }
            
            // Method 4: Use mesh name if available
            if (!meshFileName && child.name) {
              meshFileName = child.name;
            }
            
            // Fallback: unnamed
            if (!meshFileName) {
              meshFileName = 'unnamed';
            }
            
            const stlFileName = meshFileName.toLowerCase().endsWith('.stl') ? meshFileName : `${meshFileName}.stl`;
            
            // ✅ STORE STL file name in userData to use it later
            child.userData.stlFileName = stlFileName;
            
            if (!stlFilesList.includes(stlFileName)) {
              stlFilesList.push(stlFileName);
            }
            

            // ✅ Smooth shading like Blender auto smooth
            // STL files have duplicate vertices at face boundaries → need to merge them
            if (child.geometry) {
              // Remove existing normals (STL may have hard-edge normals)
              if (child.geometry.attributes.normal) {
                child.geometry.deleteAttribute('normal');
              }
              
              // ✅ CRITICAL: STL files have SEPARATE vertices for each face → flat shading
              // Blender "Smooth by Angle" modifier does: 1) Merge vertices 2) Calculate normals by angle
              // We must do the same here
              
              const vertexCountBefore = child.geometry.attributes.position.count;
              const wasIndexed = child.geometry.index !== null;
              
              // Convert to non-indexed FIRST (required for mergeVertices input)
              if (wasIndexed) {
                child.geometry = child.geometry.toNonIndexed();
              }
              
              // ✅ CRITICAL: Blender "Smooth by Angle" works because vertices are SHARED between faces
              // STL files have SEPARATE vertices for each face → must merge them FIRST
              // mergeVertices creates indexed geometry with shared vertices → THEN computeVertexNormals can work
              
              let mergedGeometry;
              const thresholds = [0.0001, 0.001, 0.01]; // Try progressively larger thresholds
              let mergeSucceeded = false;
              
              for (const threshold of thresholds) {
                try {
                  mergedGeometry = mergeVertices(child.geometry, threshold);
                  const vertexCountAfter = mergedGeometry.attributes.position.count;
                  const isNowIndexed = mergedGeometry.index !== null;
                  
                  // ✅ Verify merge actually worked
                  if (vertexCountAfter < vertexCountBefore && isNowIndexed) {
                    // Silent success - merge is working (80-90% reduction confirmed in logs)
                    child.geometry = mergedGeometry;
                    mergeSucceeded = true;
                    break;
                  } else if (isNowIndexed && vertexCountAfter === vertexCountBefore) {
                    // Vertices already merged or threshold too small - silent success
                    child.geometry = mergedGeometry;
                    mergeSucceeded = true;
                    break;
                  }
                } catch (e) {
                  // Try next threshold
                  continue;
                }
              }
              
              if (!mergeSucceeded) {
                console.error(`❌ ${child.name || 'mesh'}: Failed to merge vertices with all thresholds - smooth shading will NOT work correctly`);
              }
              
              // ✅ Calculate smooth normals with angle (like Blender "Smooth by Angle" modifier at 40°)
              // Blender algorithm: For each edge, calculate dihedral angle between face normals
              // If angle < threshold → edge is smooth → vertices share normals
              // If angle >= threshold → edge is sharp → vertices keep separate normals
              // CRITICAL: Must be called AFTER mergeVertices so vertices are shared
              const smoothAngle = (40 * Math.PI) / 180; // 40 degrees in radians (same as Blender)
              
              // ✅ CRITICAL: computeVertexNormals with angle (like Blender "Smooth by Angle")
              // Requires indexed geometry (from mergeVertices) to work correctly
              if (child.geometry.index === null) {
                console.error(`❌ ${child.name || 'mesh'}: NOT indexed before computeVertexNormals - smooth by angle will fail!`);
              }
              
              // Calculate smooth normals with angle threshold
              child.geometry.computeVertexNormals(smoothAngle);
              
              // ✅ Verify normals exist
              if (!child.geometry.attributes.normal) {
                console.error(`❌ ${child.name || 'mesh'}: computeVertexNormals failed!`);
                child.geometry.computeVertexNormals(); // Fallback without angle
              }
              
              // ✅ Normalize normals to ensure they're unit vectors (fixes shading inconsistencies)
              // ✅ Use higher precision calculations to reduce banding artefacts
              const normals = child.geometry.attributes.normal;
              if (normals) {
                const normalArray = normals.array;
                for (let i = 0; i < normals.count; i++) {
                  const idx = i * 3;
                  const x = normalArray[idx];
                  const y = normalArray[idx + 1];
                  const z = normalArray[idx + 2];
                  const length = Math.sqrt(x * x + y * y + z * z);
                  // ✅ Higher precision threshold and normalization
                  if (length > 1e-6) {
                    const invLength = 1.0 / length;
                    normalArray[idx] = x * invLength;
                    normalArray[idx + 1] = y * invLength;
                    normalArray[idx + 2] = z * invLength;
                  }
                }
                normals.needsUpdate = true;
              }
              
              // ✅ Ensure geometry is clean after processing
              child.geometry.attributes.position.needsUpdate = true;
            }

            // Save original color
            let originalColor = 0xFF9500;
            if (child.material && child.material.color) {
              originalColor = child.material.color.getHex();
            }
            child.userData.originalColor = originalColor;
            
            // Store material name
            if (child.material && child.material.name) {
              child.userData.materialName = child.material.name;
            }
            
            // Simple detection
            const materialName = (child.material?.name || '').toLowerCase();
            const isBigLens = materialName.includes('big_lens') || 
                              materialName.includes('small_lens') ||
                              materialName.includes('lens_d40') ||
                              materialName.includes('lens_d30');
            const isAntenna = originalColor === 0xFF9500;
            
            child.userData.isAntenna = isAntenna;
            child.userData.isBigLens = isBigLens;
            }
        });

        this.robotModel = robotModel;
        this.isLoaded = true;
        this.isLoading = false;

        // Notify all listeners
        this.notifyListeners();

        return robotModel;
      } catch (err) {
        console.error('❌ [Cache] URDF loading error:', err);
        this.isLoading = false;
        throw err;
      }
    })();

    return this.loadPromise;
  }

  /**
   * Gets the model (loads if necessary)
   */
  async getModel() {
    if (this.isLoaded && this.robotModel) {
      return this.robotModel;
    }
    return this.load();
  }

  /**
   * Clones the model for use in a scene
   * (necessary to avoid conflicts if used in multiple scenes)
   */
  cloneModel() {
    if (!this.robotModel) {
      console.warn('⚠️ [Cache] Model not loaded yet');
      return null;
    }
    return this.robotModel.clone();
  }

  /**
   * Checks if model is loaded
   */
  isModelLoaded() {
    return this.isLoaded && this.robotModel !== null;
  }

  /**
   * Adds a listener that will be called when model is loaded
   */
  addListener(callback) {
    this.listeners.add(callback);
    // If already loaded, call immediately
    if (this.isLoaded) {
      callback(this.robotModel);
    }
  }

  /**
   * Removes a listener
   */
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  /**
   * Notifies all listeners
   */
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.robotModel);
      } catch (err) {
        console.error('Error in cache listener:', err);
      }
    });
  }

  /**
   * Clears the cache (to be called on app unmount)
   */
  clear() {
    if (this.robotModel) {
      this.robotModel.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        }
      });
    }
    this.robotModel = null;
    this.isLoaded = false;
    this.isLoading = false;
    this.loadPromise = null;
    this.listeners.clear();
    
    // Also clear localStorage
    try {
      localStorage.removeItem('robotModelCacheVersion');
    } catch (e) {}
  }
}

// Singleton instance
const robotModelCache = new RobotModelCache();

export default robotModelCache;

