import { db, auth } from '$lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  deleteDoc,
  updateDoc 
} from 'firebase/firestore';

// Projects collection reference
const projectsCollectionRef = collection(db, 'projects');

/**
 * Create a new project
 * @param {Object} project - The project data
 * @param {string} project.name - Name of the project
 * @param {string} project.description - Description of the project
 * @param {string} project.userId - ID of the user creating the project
 * @returns {Promise<string>} - The ID of the created project
 */
export async function createProject(project) {
  const newProjectRef = doc(projectsCollectionRef);
  const timestamp = serverTimestamp();
  
  const projectData = {
    id: newProjectRef.id,
    name: project.name,
    description: project.description || '',
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: project.userId,
    members: [project.userId], // Initial members list includes creator
    statusOptions: [
      { id: 'draft', name: 'Draft', color: 'gray' },
      { id: 'review', name: 'In Review', color: 'blue' },
      { id: 'approved', name: 'Approved', color: 'green' },
      { id: 'rejected', name: 'Rejected', color: 'red' }
    ]
  };
  
  await setDoc(newProjectRef, projectData);
  return newProjectRef.id;
}

/**
 * Get projects for the current user
 * @returns {Promise<Array>} - Array of projects
 */
export async function getUserProjects() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  const projectsQuery = collection(db, 'projects');
  const snapshot = await getDocs(query(projectsQuery, where('members', 'array-contains', user.uid)));
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/**
 * Get a single project by ID
 * @param {string} projectId - The project ID
 * @returns {Promise<Object>} - The project data
 */
export async function getProject(projectId) {
  const projectRef = doc(projectsCollectionRef, projectId);
  const projectDoc = await getDoc(projectRef);
  
  if (!projectDoc.exists()) {
    throw new Error('Project not found');
  }
  
  return {
    id: projectDoc.id,
    ...projectDoc.data()
  };
}

/**
 * Delete a project by ID
 * @param {string} projectId - The project ID to delete
 * @returns {Promise<void>}
 */
export async function deleteProject(projectId) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  const projectRef = doc(projectsCollectionRef, projectId);
  const projectDoc = await getDoc(projectRef);
  
  if (!projectDoc.exists()) {
    throw new Error('Project not found');
  }
  
  const projectData = projectDoc.data();
  
  // Check if the current user is the creator of the project
  if (projectData.createdBy !== user.uid) {
    throw new Error('You do not have permission to delete this project');
  }
  
  // Delete the project
  await deleteDoc(projectRef);
}

/**
 * Update an existing project
 * @param {string} projectId - The ID of the project to update
 * @param {Object} projectData - The updated project data
 * @param {string} projectData.name - Updated name of the project
 * @param {string} projectData.description - Updated description of the project
 * @param {Array} projectData.tags - Updated tags for the project
 * @returns {Promise<void>}
 */
export async function updateProject(projectId, projectData) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  const projectRef = doc(projectsCollectionRef, projectId);
  const projectDoc = await getDoc(projectRef);
  
  if (!projectDoc.exists()) {
    throw new Error('Project not found');
  }
  
  const currentProject = projectDoc.data();
  
  // Check if the current user is a member of the project
  if (!currentProject.members.includes(user.uid)) {
    throw new Error('You do not have permission to edit this project');
  }
  
  // Prepare update data with timestamp
  const updateData = {
    ...projectData,
    updatedAt: serverTimestamp()
  };
  
  // Update the project
  await updateDoc(projectRef, updateData);
}