import * as THREE from 'three';

/**
 * Utilitaires pour la création et la gestion des matériaux du robot
 */

/**
 * Crée un gradient map pour le cell shading avec un meilleur contraste
 * @param {number} bands - Nombre de bandes de couleur (2-10)
 * @returns {THREE.DataTexture}
 */
export function createCellShadingGradient(bands = 3) {
  const colors = new Uint8Array(bands * 3);
  
  // ✅ Gradient EXTRÊME pour cell shading très visible
  // Utiliser des valeurs fixes pour maximiser le contraste
  if (bands === 3) {
    // 3 bands : Ombre / Mi-ton / Lumière
    colors[0] = 40;   colors[1] = 40;   colors[2] = 40;   // Ombre profonde
    colors[3] = 140;  colors[4] = 140;  colors[5] = 140;  // Mi-ton
    colors[6] = 255;  colors[7] = 255;  colors[8] = 255;  // Lumière pleine
  } else if (bands === 4) {
    // 4 bands pour plus de nuance
    colors[0] = 30;   colors[1] = 30;   colors[2] = 30;   // Ombre très sombre
    colors[3] = 100;  colors[4] = 100;  colors[5] = 100;  // Ombre moyenne
    colors[6] = 180;  colors[7] = 180;  colors[8] = 180;  // Lumière moyenne
    colors[9] = 255;  colors[10] = 255; colors[11] = 255; // Lumière pleine
  } else {
    // Pour les autres nombres de bands, gradient progressif avec plus de contraste
    for (let i = 0; i < bands; i++) {
      const t = i / (bands - 1);
      // Courbe exponentielle pour plus de contraste
      const brightness = Math.pow(t, 0.7) * 255;
      
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness;
    }
  }
  
  const gradientTexture = new THREE.DataTexture(colors, bands, 1, THREE.RGBFormat);
  gradientTexture.minFilter = THREE.NearestFilter;
  gradientTexture.magFilter = THREE.NearestFilter;
  gradientTexture.needsUpdate = true;
  
  console.log('🎨 Gradient map created:', {
    bands,
    values: Array.from(colors).slice(0, bands * 3),
  });
  
  return gradientTexture;
}

/**
 * Shader custom pour cell shading AAA avec rim lighting et highlights spéculaires
 */
export const cellShadingShader = {
  uniforms: {
    baseColor: { value: new THREE.Color(0xFF9500) },
    lightDirection: { value: new THREE.Vector3(0.5, 0.7, 0.5).normalize() },
    lightDirection2: { value: new THREE.Vector3(-0.3, 0.5, 0.3).normalize() },
    shadowColor: { value: new THREE.Color(0x404040) },
    midtoneColor: { value: new THREE.Color(0x909090) },
    highlightColor: { value: new THREE.Color(0xffffff) },
    rimColor: { value: new THREE.Color(0xffcc88) },
    rimPower: { value: 3.5 },
    rimIntensity: { value: 0.35 },
    specularPower: { value: 56.0 },
    specularIntensity: { value: 0.25 },
    bands: { value: 100 },
    ambientIntensity: { value: 0.4 },
    contrastBoost: { value: 0.85 },
    smoothness: { value: 0.4 },
    opacity: { value: 1.0 },
  },
  
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vWorldPosition;
    
    void main() {
      // Normale en world space
      vNormal = normalize(normalMatrix * normal);
      
      // Position de la caméra
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      
      // Position world
      vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  
  fragmentShader: `
    uniform vec3 baseColor;
    uniform vec3 lightDirection;
    uniform vec3 lightDirection2;
    uniform vec3 shadowColor;
    uniform vec3 midtoneColor;
    uniform vec3 highlightColor;
    uniform vec3 rimColor;
    uniform float rimPower;
    uniform float rimIntensity;
    uniform float specularPower;
    uniform float specularIntensity;
    uniform float bands;
    uniform float ambientIntensity;
    uniform float contrastBoost;
    uniform float smoothness;
    uniform float opacity;
    
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vWorldPosition;
    
    // Fonction de quantification smooth avec anti-aliasing
    float quantizeSmooth(float value, float steps, float smoothFactor) {
      float quantized = floor(value * steps) / steps;
      float nextBand = floor(value * steps + 1.0) / steps;
      float t = fract(value * steps);
      
      // Smoothstep pour des transitions douces entre les bandes
      t = smoothstep(1.0 - smoothFactor, 1.0, t);
      
      return mix(quantized, nextBand, t);
    }
    
    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(vViewPosition);
      vec3 light = normalize(lightDirection);
      vec3 light2 = normalize(lightDirection2);
      
      // ===== 1. DIFFUSE CELL SHADING (Multi-light avec smooth) =====
      // Lumière principale
      float NdotL = max(dot(normal, light), 0.0);
      // Lumière secondaire (fill light)
      float NdotL2 = max(dot(normal, light2), 0.0) * 0.35;
      // Combiner les deux lumières
      float combinedLight = NdotL + NdotL2;
      
      // Quantification smooth en bandes
      float diffuse = quantizeSmooth(combinedLight, bands, smoothness);
      
      // Boost du contraste (optionnel, désactivé par défaut)
      if (contrastBoost != 1.0) {
        diffuse = pow(diffuse, 1.0 / contrastBoost);
      }
      
      // Mapper les bandes sur les couleurs avec transitions douces
      vec3 shadedColor;
      if (diffuse < 0.33) {
        // Zone d'ombre
        shadedColor = mix(shadowColor, midtoneColor, diffuse / 0.33) * baseColor;
      } else if (diffuse < 0.66) {
        // Mi-ton vers couleur de base
        shadedColor = mix(midtoneColor * baseColor, baseColor, (diffuse - 0.33) / 0.33);
      } else {
        // Couleur de base vers highlight (élégant et subtil)
        shadedColor = mix(baseColor, baseColor * mix(vec3(1.0), highlightColor, 0.2), (diffuse - 0.66) / 0.34);
      }
      
      // ===== 2. RIM LIGHTING (Fresnel élégant) =====
      float fresnel = 1.0 - max(dot(viewDir, normal), 0.0);
      fresnel = pow(fresnel, rimPower);
      
      // Rim light avec transition douce et élégante
      float rimSmooth = smoothstep(0.4, 0.75, fresnel);
      vec3 rimLight = rimColor * rimSmooth * rimIntensity;
      
      // ===== 3. SPECULAR HIGHLIGHT (Élégant) =====
      vec3 halfVector = normalize(light + viewDir);
      float NdotH = max(dot(normal, halfVector), 0.0);
      float spec = pow(NdotH, specularPower);
      
      // Specular doux avec smoothstep pour un rendu élégant
      float specSmooth = smoothstep(0.65, 0.85, spec);
      vec3 specular = highlightColor * specSmooth * specularIntensity;
      
      // ===== 4. AMBIENT =====
      // AO élégant basé sur la normale Y pour plus de profondeur
      float ao = smoothstep(-0.4, 0.6, normal.y) * 0.25 + 0.75;
      vec3 ambient = baseColor * ambientIntensity * ao;
      
      // ===== COMBINAISON FINALE =====
      vec3 finalColor = shadedColor + ambient + rimLight + specular;
      
      // Ajustement subtil de la saturation pour un rendu élégant
      float luminance = dot(finalColor, vec3(0.299, 0.587, 0.114));
      finalColor = mix(vec3(luminance), finalColor, 1.0);
      
      // Clamp pour éviter l'overexposure (le tone mapping est géré par le renderer)
      finalColor = clamp(finalColor, 0.0, 1.0);
      
      // ✅ Utiliser l'opacité uniforme pour la transparence
      gl_FragColor = vec4(finalColor, opacity);
    }
  `
};

/**
 * Crée un matériau cell shading AAA avec shader custom
 * @param {number} baseColorHex - Couleur de base en hexa
 * @param {object} options - Options du shader
 * @returns {THREE.ShaderMaterial}
 */
export function createCellShadingMaterial(baseColorHex = 0xFF9500, options = {}) {
  // ✅ Créer manuellement les uniforms pour éviter les problèmes de clonage
  const uniforms = {
    baseColor: { value: new THREE.Color(baseColorHex) },
    lightDirection: { value: new THREE.Vector3(0.5, 0.7, 0.5).normalize() },
    lightDirection2: { value: new THREE.Vector3(-0.3, 0.5, 0.3).normalize() },
    shadowColor: { value: new THREE.Color(0x404040) },
    midtoneColor: { value: new THREE.Color(0x909090) },
    highlightColor: { value: new THREE.Color(0xffffff) },
    rimColor: { value: new THREE.Color(0xffcc88) },
    rimPower: { value: 3.5 }, // Optimisé pour un rim light élégant
    rimIntensity: { value: options.rimIntensity ?? 0.4 }, // Légèrement augmenté pour plus de punch
    specularPower: { value: 56.0 }, // Optimisé pour des highlights subtils mais visibles
    specularIntensity: { value: options.specularIntensity ?? 0.3 }, // Légèrement augmenté
    bands: { value: options.bands ?? 100 }, // Résolution optimale pour qualité/performance
    ambientIntensity: { value: options.ambientIntensity ?? 0.45 }, // Légèrement augmenté pour plus de luminosité
    contrastBoost: { value: options.contrastBoost ?? 0.9 }, // Optimisé pour un contraste élégant
    smoothness: { value: options.smoothness ?? 0.45 }, // Légèrement augmenté pour transitions plus douces
    opacity: { value: options.opacity ?? 1.0 },
  };
  
  const material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: cellShadingShader.vertexShader,
    fragmentShader: cellShadingShader.fragmentShader,
    lights: false, // On gère nous-mêmes l'éclairage dans le shader
    side: THREE.FrontSide,
    depthWrite: true,
    depthTest: true,
    transparent: options.opacity !== undefined && options.opacity < 1.0, // Activer transparent si opacity < 1.0
    opacity: options.opacity ?? 1.0, // Définir l'opacité du matériau
    // ✅ Smooth shading est contrôlé par les normales de la géométrie (computeVertexNormals)
    // Pas de propriété flatShading sur ShaderMaterial
  });
  
  console.log('✨ Cell shading AAA+ material created:', {
    baseColor: `#${baseColorHex.toString(16).padStart(6, '0')}`,
    bands: material.uniforms.bands.value,
    quality: 'Ultra',
  });
  
  return material;
}

/**
 * Met à jour les paramètres du shader cell shading
 * @param {THREE.ShaderMaterial} material - Le matériau à mettre à jour
 * @param {object} params - Paramètres à modifier
 */
export function updateCellShadingMaterial(material, params = {}) {
  if (!material.uniforms) return;
  
  // ✅ Mettre à jour tous les paramètres même s'ils sont undefined (utiliser les valeurs actuelles)
  // Cela permet de forcer la mise à jour même si certaines valeurs ne changent pas
  let updated = false;
  
  if (params.bands !== undefined) {
    material.uniforms.bands.value = params.bands;
    updated = true;
  }
  if (params.rimIntensity !== undefined) {
    material.uniforms.rimIntensity.value = params.rimIntensity;
    updated = true;
  }
  if (params.specularIntensity !== undefined) {
    material.uniforms.specularIntensity.value = params.specularIntensity;
    updated = true;
  }
  if (params.ambientIntensity !== undefined) {
    material.uniforms.ambientIntensity.value = params.ambientIntensity;
    updated = true;
  }
  if (params.rimPower !== undefined) {
    material.uniforms.rimPower.value = params.rimPower;
    updated = true;
  }
  if (params.specularPower !== undefined) {
    material.uniforms.specularPower.value = params.specularPower;
    updated = true;
  }
  if (params.contrastBoost !== undefined) {
    material.uniforms.contrastBoost.value = params.contrastBoost;
    updated = true;
  }
  if (params.smoothness !== undefined) {
    material.uniforms.smoothness.value = params.smoothness;
    updated = true;
  }
  if (params.opacity !== undefined) {
    material.uniforms.opacity.value = params.opacity;
    // ✅ Mettre à jour aussi material.opacity et material.transparent
    material.opacity = params.opacity;
    material.transparent = params.opacity < 1.0;
    updated = true;
  }
  
  // ✅ Toujours marquer comme besoin de mise à jour pour forcer le re-render
  if (updated) {
    material.needsUpdate = true;
  }
}

/**
 * Shader X-ray AAA avec rim lighting avancé, depth-based opacity, et subsurface scattering
 */
export const xrayShader = {
  uniforms: {
    baseColor: { value: new THREE.Color(0x7A8590) },
    rimColor: { value: new THREE.Color(0xFFFFFF) },
    rimPower: { value: 2.0 },
    rimIntensity: { value: 0.4 },
    opacity: { value: 0.5 },
    edgeIntensity: { value: 0.3 },
    depthIntensity: { value: 0.3 }, // ✅ Nouveau : intensité de l'effet depth-based
    subsurfaceColor: { value: new THREE.Color(0xB0C4DE) }, // ✅ Nouveau : couleur subsurface scattering
    subsurfaceIntensity: { value: 0.2 }, // ✅ Nouveau : intensité subsurface
  },
  
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vWorldPosition;
    varying float vDepth; // ✅ Nouveau : profondeur pour depth-based opacity
    
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      
      // ✅ Calculer la profondeur (distance à la caméra)
      vDepth = length(vViewPosition);
      
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  
  fragmentShader: `
    uniform vec3 baseColor;
    uniform vec3 rimColor;
    uniform float rimPower;
    uniform float rimIntensity;
    uniform float opacity;
    uniform float edgeIntensity;
    uniform float depthIntensity; // ✅ Nouveau
    uniform vec3 subsurfaceColor; // ✅ Nouveau
    uniform float subsurfaceIntensity; // ✅ Nouveau
    
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying float vDepth; // ✅ Nouveau
    
    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(vViewPosition);
      
      // ===== RIM LIGHTING AVANCÉ (Fresnel effect avec variation de couleur) =====
      float fresnel = 1.0 - max(dot(viewDir, normal), 0.0);
      fresnel = pow(fresnel, rimPower);
      
      // ✅ Rim light avec transition douce et variation de couleur selon l'angle
      float rimSmooth = smoothstep(0.2, 0.9, fresnel);
      vec3 rimColorVaried = mix(rimColor, vec3(0.9, 0.95, 1.0), fresnel * 0.5); // Légèrement bleuté aux bords
      vec3 rimLight = rimColorVaried * rimSmooth * rimIntensity;
      
      // ===== EDGE DETECTION AMÉLIORÉ =====
      float edge = 1.0 - abs(dot(viewDir, normal));
      edge = pow(edge, 2.5); // Légèrement moins agressif
      vec3 edgeHighlight = rimColor * edge * edgeIntensity;
      
      // ===== SUBSURFACE SCATTERING (simulation de lumière qui traverse) =====
      // Plus la surface est perpendiculaire à la vue, plus la lumière traverse
      float subsurfaceFactor = max(dot(viewDir, normal), 0.0);
      subsurfaceFactor = pow(subsurfaceFactor, 1.5);
      vec3 subsurface = subsurfaceColor * subsurfaceFactor * subsurfaceIntensity;
      
      // ===== DEPTH-BASED OPACITY (les parties plus épaisses sont plus opaques) =====
      // Normaliser la profondeur (ajuster selon votre scène)
      float normalizedDepth = clamp((vDepth - 0.1) / 0.5, 0.0, 1.0);
      float depthOpacity = 1.0 + normalizedDepth * depthIntensity;
      float finalOpacity = opacity * depthOpacity;
      
      // ===== COULEUR FINALE =====
      vec3 finalColor = baseColor + rimLight + edgeHighlight + subsurface;
      
      // ✅ Clamp avec un peu plus de headroom pour le bloom
      finalColor = clamp(finalColor, 0.0, 1.2);
      
      gl_FragColor = vec4(finalColor, clamp(finalOpacity, 0.0, 1.0));
    }
  `
};

/**
 * Crée un matériau X-ray amélioré avec rim lighting
 * @param {number} baseColorHex - Couleur de base en hexa
 * @param {object} options - Options du shader
 * @returns {THREE.ShaderMaterial}
 */
export function createXrayMaterial(baseColorHex = 0x7A8590, options = {}) {
  const uniforms = {
    baseColor: { value: new THREE.Color(baseColorHex) },
    rimColor: { value: new THREE.Color(options.rimColor || 0xFFFFFF) },
    rimPower: { value: options.rimPower ?? 2.0 },
    rimIntensity: { value: options.rimIntensity ?? 0.4 },
    opacity: { value: options.opacity ?? 0.5 },
    edgeIntensity: { value: options.edgeIntensity ?? 0.3 },
    depthIntensity: { value: options.depthIntensity ?? 0.3 }, // ✅ Nouveau
    subsurfaceColor: { value: new THREE.Color(options.subsurfaceColor || 0xB0C4DE) }, // ✅ Nouveau
    subsurfaceIntensity: { value: options.subsurfaceIntensity ?? 0.2 }, // ✅ Nouveau
  };
  
  const material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: xrayShader.vertexShader,
    fragmentShader: xrayShader.fragmentShader,
    transparent: true,
    depthWrite: false, // ✅ Standard pour transparents : ne pas écrire dans le depth buffer
    depthTest: true,
    side: THREE.DoubleSide,
    opacity: options.opacity ?? 0.5,
    alphaTest: 0.001, // ✅ Rejeter les pixels presque transparents (très faible pour éviter les artefacts)
  });
  
  return material;
}

/**
 * Met à jour les paramètres du shader X-ray
 * @param {THREE.ShaderMaterial} material - Le matériau à mettre à jour
 * @param {object} params - Paramètres à modifier
 */
export function updateXrayMaterial(material, params = {}) {
  if (!material.uniforms) return;
  
  if (params.baseColor !== undefined) {
    material.uniforms.baseColor.value.set(params.baseColor);
  }
  if (params.rimColor !== undefined) {
    material.uniforms.rimColor.value.set(params.rimColor);
  }
  if (params.rimPower !== undefined) {
    material.uniforms.rimPower.value = params.rimPower;
  }
  if (params.rimIntensity !== undefined) {
    material.uniforms.rimIntensity.value = params.rimIntensity;
  }
  if (params.opacity !== undefined) {
    material.uniforms.opacity.value = params.opacity;
    material.opacity = params.opacity;
  }
  if (params.edgeIntensity !== undefined) {
    material.uniforms.edgeIntensity.value = params.edgeIntensity;
  }
  
  material.needsUpdate = true;
}


