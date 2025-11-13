/**
 * Generates readable names for robot components
 * Based on position and mesh characteristics
 */

const COMPONENT_NAMES = [
  'XL330 Motor',
  'Position Sensor',
  'Electronic Board',
  'Stewart Module',
  'Servo Motor',
  'Torque Sensor',
  'Left Antenna',
  'Right Antenna',
  'Camera Mount',
  'Main Lens',
  'Audio System',
  'Electronic Interface',
  'Control Module',
  'IMU Sensor',
  'Mechanical Support',
  'Encoder',
  'Connector',
  'Power Module',
  'Printed Circuit',
  'Regulator',
];

/**
 * Génère un nom lisible pour un composant
 * @param {THREE.Mesh} mesh - Le mesh à nommer
 * @param {number} index - Index du mesh dans la liste
 * @param {number} total - Nombre total de meshes
 * @returns {string} Nom lisible du composant
 */
export function getComponentName(mesh, index, total) {
  // Utiliser un nom de la liste basé sur l'index
  // Avec modulo pour éviter de dépasser
  const nameIndex = index % COMPONENT_NAMES.length;
  return COMPONENT_NAMES[nameIndex];
}

/**
 * Generates a short name for quick display based on actual mesh name
 */
export function getShortComponentName(mesh, index, total) {
  if (!mesh) {
    console.warn(`⚠️ No mesh provided for index ${index}`);
    return getGenericName(index);
  }
  
  // Chercher le nom dans la hiérarchie parent (URDF link)
  let name = mesh.name;
  let currentParent = mesh.parent;
  let depth = 0;
  
  // Remonter jusqu'à 3 niveaux dans la hiérarchie pour trouver un nom
  while ((!name || name === '') && currentParent && depth < 3) {
    name = currentParent.name;
    currentParent = currentParent.parent;
    depth++;
  }
  
  // Si toujours pas de nom, utiliser un nom générique basé sur l'index
  if (!name || name === '' || name.match(/^[0-9a-f]{8}-/i)) {
    // Si c'est un UUID, utiliser nom générique
    return getGenericName(index);
  }
  
  // Nettoyer le nom
  name = name
    .replace(/_visual.*$/, '') // Enlever _visual_0, _visual_1, etc.
    .replace(/_collision.*$/, '') // Enlever _collision
    .replace(/_\d+$/, '') // Enlever les chiffres en fin
    .replace(/_/g, ' ') // Remplacer underscores par espaces
    .trim()
    .replace(/\b\w/g, l => l.toUpperCase()); // Capitaliser chaque mot
  
  // Si le nom est trop long, le raccourcir
  if (name.length > 25) {
    // Prendre les 3 premiers mots
    const words = name.split(' ');
    name = words.slice(0, 3).join(' ');
  }
  
  return name || getGenericName(index);
}

/**
 * Génère un nom générique basé sur l'index
 * Plus joli que "Component 1"
 */
function getGenericName(index) {
  const categories = [
    'Motor',
    'Sensor',
    'Module',
    'Interface',
    'Support',
    'Circuit',
    'Mount',
    'Frame',
  ];
  
  const categoryIndex = (index - 1) % categories.length;
  const number = Math.floor((index - 1) / categories.length) + 1;
  
  return `${categories[categoryIndex]} ${number}`;
}

