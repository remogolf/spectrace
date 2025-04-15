import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
  arrayUnion,
  onSnapshot,
  collection as fsCollection,
  query as fsQuery,
  orderBy as fsOrderBy
} from 'firebase/firestore';

const requirementsCollectionRef = collection(db, 'requirements');

// --- Helper function for ID Generation ---

/**
 * Generates hierarchical IDs for all requirements in a tree
 * @param {Array} requirements - Flat array of all requirements
 * @param {string} sectionPrefix - Default prefix for the section (e.g., "REQ")
 * @returns {Array} - Updated requirements with hierarchical IDs
 */
function generateHierarchicalIds(requirements, sectionPrefix = "REQ") {
  const rootItems = [];
  const itemsById = {};
  
  requirements.forEach(req => {
    itemsById[req.id] = { ...req, children: [] };
  });
  
  requirements.forEach(req => {
    if (!req.parentId) {
      rootItems.push(itemsById[req.id]);
    } else if (itemsById[req.parentId]) {
      itemsById[req.parentId].children.push(itemsById[req.id]);
    } else {
      console.warn(`Item ${req.id} has parent ${req.parentId} which doesn't exist. Treating as root.`);
      rootItems.push(itemsById[req.id]);
    }
  });
  
  const sortByOrder = (items) => {
    items.sort((a, b) => (a.order || 0) - (b.order || 0));
    items.forEach(item => {
      if (item.children && item.children.length > 0) {
        sortByOrder(item.children);
      }
    });
  };
  
  sortByOrder(rootItems);
  
  const assignIds = (items, defaultPrefix, parentPath = null) => {
    items.forEach((item, index) => {
      let currentPrefix = defaultPrefix;
      // Use item's specific prefix if it's a root item and has one
      if (!parentPath && item.sectionPrefix) {
        currentPrefix = item.sectionPrefix;
      }
      
      const position = index + 1;
      const path = parentPath ? `${parentPath}.${position}` : `${position}`;
      item.hierarchicalPath = `${currentPrefix}_${path}`;
      
      if (item.children && item.children.length > 0) {
        // Pass the determined prefix down, don't reset for children
        assignIds(item.children, currentPrefix, path);
      }
    });
    return items;
  };
  
  const updatedTree = assignIds(rootItems, sectionPrefix);
  
  const flattenTree = (items, result = []) => {
    items.forEach(item => {
      const { children, ...itemWithoutChildren } = item;
      result.push(itemWithoutChildren);
      if (children && children.length > 0) {
        flattenTree(children, result);
      }
    });
    return result;
  };
  
  return flattenTree(updatedTree);
}

// --- Firestore Functions ---

/**
 * Create a new requirement
 * @param {Object} requirement - The requirement data
 * @param {string} requirement.title - Title of the requirement
 * @param {string} requirement.description - Description of the requirement
 * @param {string} requirement.parentId - ID of the parent requirement (null for root items)
 * @param {number} requirement.level - Nesting level (0 for root items)
 * @param {string} requirement.projectId - ID of the project this requirement belongs to
 * @param {string} requirement.status - Current status of the requirement
 * @returns {Promise<string>} - The ID of the created requirement
 */
export async function createRequirement(requirement) {
  const newRequirementRef = doc(requirementsCollectionRef);
  const timestamp = serverTimestamp();
  const jsTimestamp = new Date(); // JavaScript Date for array values
  
  // Use a batch for transaction safety
  const batch = writeBatch(db);
  
  // Get the parent's hierarchical path if it exists
  let parentPath = '';
  let order = 1;
  let parentLevel = -1;
  
  if (requirement.parentId) {
    const parentDoc = await getDoc(doc(requirementsCollectionRef, requirement.parentId));
    if (parentDoc.exists()) {
      const parentData = parentDoc.data();
      parentPath = parentData.hierarchicalPath || parentData.id;
      parentLevel = parentData.level || 0;
      
      // Get siblings to determine order
      const siblingsQuery = query(
        requirementsCollectionRef, 
        where('parentId', '==', requirement.parentId),
        where('projectId', '==', requirement.projectId)
      );
      const siblingsSnapshot = await getDocs(siblingsQuery);
      order = siblingsSnapshot.size + 1;
    } else {
      throw new Error('Parent requirement not found');
    }
  } else {
    // Get root level requirements to determine order
    const rootQuery = query(
      requirementsCollectionRef,
      where('parentId', '==', null),
      where('projectId', '==', requirement.projectId)
    );
    const rootSnapshot = await getDocs(rootQuery);
    order = rootSnapshot.size + 1;
    parentLevel = -1; // Root level
  }
  
  const newLevel = parentLevel + 1;
  
  // Construct initial hierarchical path (will be recalculated)
  const initialHierarchicalPath = parentPath 
    ? `${parentPath}.${order}` 
    : `${order}`;
  
  // Create the requirement data object using timestamps
  const requirementData = {
    id: newRequirementRef.id,
    title: requirement.title,
    description: requirement.description || '',
    parentId: requirement.parentId || null,
    level: newLevel,
    projectId: requirement.projectId,
    status: requirement.status || 'draft',
    hierarchicalPath: initialHierarchicalPath, // Temporary path
    order,
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: requirement.userId,
    tags: requirement.tags || []
  };
  
  // Create a safe version of requirementData for the changelog
  const requirementDataForLog = {
    ...requirementData,
    createdAt: jsTimestamp,
    updatedAt: jsTimestamp
  };
  
  // Add changelog entry
  const changeLog = [{
    type: 'created',
    timestamp: jsTimestamp,
    userId: requirement.userId,
    changes: { action: 'created', newValue: requirementDataForLog }
  }];
  
  // Add the new requirement to the batch
  batch.set(newRequirementRef, {
    ...requirementData,
    changeLog
  });
  
  // Commit the initial creation
  await batch.commit();
  
  // Now, regenerate all hierarchical IDs for the project
  try {
    const allRequirements = await getRequirements(requirement.projectId);
    const updatedRequirements = generateHierarchicalIds(allRequirements, project.sectionPrefix || 'REQ'); // Assuming project object is available or fetched
    
    const updateBatch = writeBatch(db);
    updatedRequirements.forEach(req => {
      const reqRef = doc(requirementsCollectionRef, req.id);
      updateBatch.update(reqRef, { hierarchicalPath: req.hierarchicalPath, level: req.level, order: req.order });
    });
    await updateBatch.commit();
  } catch (regenError) {
    console.error("Error regenerating hierarchical IDs after creation:", regenError);
    // Decide how to handle this - maybe log it, but the requirement is already created.
  }
  
  return newRequirementRef.id;
}

/**
 * Get requirements for a project
 * @param {string} projectId - The project ID
 * @returns {Promise<Array>} - Array of requirements
 */
export async function getRequirements(projectId) {
  const requirementsQuery = query(
    requirementsCollectionRef,
    where('projectId', '==', projectId),
    orderBy('hierarchicalPath')
  );
  
  const snapshot = await getDocs(requirementsQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/**
 * Helper function to check if target is a descendant of source
 */
async function isDescendant(sourceId, targetId) {
  if (sourceId === targetId) return true;
  
  // Check immediate parent first
  const targetDoc = await getDoc(doc(requirementsCollectionRef, targetId));
  if (!targetDoc.exists()) return false;
  
  const targetData = targetDoc.data();
  const parentId = targetData.parentId;
  
  // If no parent, it's not a descendant
  if (!parentId) return false;
  
  // If parent is the source, it's a descendant
  if (parentId === sourceId) return true;
  
  // Check recursively
  return isDescendant(sourceId, parentId);
}

/**
 * Move a requirement to a new position
 * @param {Object} params - Parameters for the move operation
 * @param {string} params.requirementId - ID of the requirement to move
 * @param {string} params.newParentId - ID of the new parent (null for root)
 * @param {number} params.newOrder - New order within siblings
 * @param {string} params.userId - ID of the user making the change
 * @returns {Promise<void>}
 */
export async function moveRequirement({ requirementId, newParentId, newOrder, userId }) {
  console.log(`moveRequirement called: ${requirementId} to parent ${newParentId} with order ${newOrder}`);
  
  const requirementRef = doc(requirementsCollectionRef, requirementId);
  const requirementDoc = await getDoc(requirementRef);
  
  if (!requirementDoc.exists()) {
    throw new Error('Requirement not found');
  }
  
  const requirementData = requirementDoc.data();
  const projectId = requirementData.projectId; // Get projectId from the requirement being moved
  
  // Check for circular reference
  if (newParentId && await isDescendant(requirementId, newParentId)) {
    throw new Error('Cannot move a requirement to one of its descendants');
  }
  
  const oldParentId = requirementData.parentId;
  const oldOrder = requirementData.order;
  
  // Don't process if nothing changed
  if (oldParentId === newParentId && oldOrder === newOrder) {
    console.log('No change in parent or order, skipping update');
    return;
  }
  
  // Calculate new level
  let newLevel = 0;
  let parentPath = '';
  
  if (newParentId) {
    const newParentDoc = await getDoc(doc(requirementsCollectionRef, newParentId));
    if (newParentDoc.exists()) {
      const parentData = newParentDoc.data();
      newLevel = (parentData.level || 0) + 1;
      parentPath = parentData.hierarchicalPath || parentData.id;
    } else {
      throw new Error('Parent requirement not found');
    }
  } else {
    // Moving to root level
    newLevel = 0;
    parentPath = '';
  }
  
  // Construct temporary new hierarchical path (will be recalculated)
  const tempHierarchicalPath = parentPath 
    ? `${parentPath}.${newOrder}` 
    : `${newOrder}`;
  
  console.log(`Temporary hierarchical path: ${tempHierarchicalPath}`);
  
  // Start a batch update
  const batch = writeBatch(db);
  
  // Record the changes for changelog
  const changes = {
    parentId: { old: oldParentId, new: newParentId },
    level: { old: requirementData.level, new: newLevel },
    order: { old: oldOrder, new: newOrder },
    // hierarchicalPath will be updated later
  };
  
  // Update the requirement with new parent, level, and order
  const timestamp = serverTimestamp();
  const jsTimestamp = new Date(); // JavaScript Date for array values
  
  batch.update(requirementRef, {
    parentId: newParentId || null,
    level: newLevel,
    order: newOrder,
    // hierarchicalPath: tempHierarchicalPath, // Don't set temporary path here
    updatedAt: timestamp,
    changeLog: [...(requirementData.changeLog || []), {
      type: 'moved',
      timestamp: jsTimestamp, // Using JavaScript Date instead of serverTimestamp
      userId,
      changes
    }]
  });
  
  console.log('Requirement parent/order updated in batch, committing...');
  
  // Commit the move operation first
  await batch.commit();
  
  console.log('Move committed, regenerating all hierarchical IDs...');
  
  // Now, regenerate all hierarchical IDs for the project
  try {
    const allRequirements = await getRequirements(projectId);
    const projectDoc = await getDoc(doc(db, 'projects', projectId)); // Fetch project for prefix
    const projectData = projectDoc.exists() ? projectDoc.data() : {};
    const updatedRequirements = generateHierarchicalIds(allRequirements, projectData.sectionPrefix || 'REQ');
    
    const updateBatch = writeBatch(db);
    updatedRequirements.forEach(req => {
      const reqRef = doc(requirementsCollectionRef, req.id);
      // Update path, level, and order based on regeneration
      updateBatch.update(reqRef, { 
        hierarchicalPath: req.hierarchicalPath, 
        level: req.level, 
        order: req.order 
      });
    });
    await updateBatch.commit();
    console.log('Hierarchical IDs regenerated successfully.');
  } catch (regenError) {
    console.error("Error regenerating hierarchical IDs after move:", regenError);
    // Decide how to handle this - maybe log it, or try to revert the move?
  }
}

/**
 * Update requirement details
 * @param {Object} params - Parameters for the update
 * @param {string} params.requirementId - ID of the requirement to update
 * @param {Object} params.updates - Fields to update
 * @param {string} params.userId - ID of user making the change
 * @returns {Promise<void>}
 */
export async function updateRequirement({ requirementId, updates, userId }) {
  const requirementRef = doc(requirementsCollectionRef, requirementId);
  const requirementDoc = await getDoc(requirementRef);
  
  if (!requirementDoc.exists()) {
    throw new Error('Requirement not found');
  }
  
  const requirementData = requirementDoc.data();
  const timestamp = serverTimestamp();
  const jsTimestamp = new Date(); // JavaScript Date for array values
  
  // Record changes for changelog
  const changes = {};
  for (const [key, value] of Object.entries(updates)) {
    if (key !== 'changeLog' && key !== 'updatedAt') {
      changes[key] = { 
        old: requirementData[key],
        new: value 
      };
    }
  }
  
  // Only add to changelog if there are actual changes
  if (Object.keys(changes).length > 0) {
    const changeLogEntry = {
      type: 'updated',
      timestamp: jsTimestamp, // Using JavaScript Date instead of serverTimestamp
      userId,
      changes
    };
    
    await updateDoc(requirementRef, {
      ...updates,
      updatedAt: timestamp,
      changeLog: [...(requirementData.changeLog || []), changeLogEntry]
    });
  }
}

/**
 * Delete a requirement
 * @param {string} requirementId - ID of the requirement to delete
 * @returns {Promise<void>}
 */
export async function deleteRequirement(requirementId) {
  const requirementRef = doc(requirementsCollectionRef, requirementId);
  const requirementDoc = await getDoc(requirementRef);
  
  if (!requirementDoc.exists()) {
    throw new Error('Requirement not found');
  }
  
  const requirementData = requirementDoc.data();
  const projectId = requirementData.projectId; // Get projectId before deleting
  const userId = auth.currentUser?.uid; // Get current user ID

  // First check if it has children
  const childrenQuery = query(
    requirementsCollectionRef,
    where('parentId', '==', requirementId)
  );
  
  const childrenSnapshot = await getDocs(childrenQuery);
  if (childrenSnapshot.size > 0) {
    throw new Error('Cannot delete a requirement with children. Please delete or move the children first.');
  }
  
  // Delete all comments for this requirement first (if applicable)
  // Assuming comments are stored in a subcollection
  const commentsRef = collection(db, 'requirements', requirementId, 'comments');
  const commentsSnapshot = await getDocs(commentsRef);
  
  const deleteBatch = writeBatch(db);
  if (commentsSnapshot.size > 0) {
    commentsSnapshot.docs.forEach(commentDoc => {
      deleteBatch.delete(commentDoc.ref);
    });
  }
  
  // Add the requirement deletion to the batch
  deleteBatch.delete(requirementRef);
  
  // Commit the deletion batch
  await deleteBatch.commit();
  
  console.log(`Requirement ${requirementId} deleted. Regenerating IDs for project ${projectId}...`);

  // Now, regenerate all hierarchical IDs for the project
  try {
    const allRequirements = await getRequirements(projectId);
    const projectDoc = await getDoc(doc(db, 'projects', projectId)); // Fetch project for prefix
    const projectData = projectDoc.exists() ? projectDoc.data() : {};
    const updatedRequirements = generateHierarchicalIds(allRequirements, projectData.sectionPrefix || 'REQ');
    
    const updateBatch = writeBatch(db);
    updatedRequirements.forEach(req => {
      const reqRef = doc(requirementsCollectionRef, req.id);
      // Update path, level, and order based on regeneration
      updateBatch.update(reqRef, { 
        hierarchicalPath: req.hierarchicalPath, 
        level: req.level, 
        order: req.order 
      });
    });
    await updateBatch.commit();
    console.log('Hierarchical IDs regenerated successfully after deletion.');
  } catch (regenError) {
    console.error("Error regenerating hierarchical IDs after deletion:", regenError);
    // Log the error, but the deletion was successful.
  }
}

// --- Comments Firestore Logic ---

/**
 * Get all comments for a requirement, ordered by createdAt
 */
export async function getComments(requirementId) {
  const commentsRef = collection(db, 'requirements', requirementId, 'comments');
  const q = query(commentsRef, orderBy('createdAt'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Add a new comment (top-level or reply)
 */
export async function addComment(requirementId, comment) {
  const commentsRef = collection(db, 'requirements', requirementId, 'comments');
  const newCommentRef = doc(commentsRef);
  
  // Add timestamp if not provided
  const timestamp = serverTimestamp();
  const enhancedComment = { 
    ...comment, 
    id: newCommentRef.id,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  
  // Check if the requirement exists first
  const requirementRef = doc(requirementsCollectionRef, requirementId);
  const requirementDoc = await getDoc(requirementRef);
  
  if (!requirementDoc.exists()) {
    throw new Error('Requirement not found');
  }
  
  await setDoc(newCommentRef, enhancedComment);
  return newCommentRef.id;
}

/**
 * Mark a comment as resolved/unresolved
 */
export async function resolveComment(requirementId, commentId, resolved) {
  const commentRef = doc(db, 'requirements', requirementId, 'comments', commentId);
  await updateDoc(commentRef, { resolved });
}

/**
 * Add a reply to a comment (threaded)
 */
export async function replyToComment(requirementId, parentCommentId, reply) {
  // Just add a comment with parentCommentId set
  return addComment(requirementId, { ...reply, parentCommentId });
}

/**
 * Subscribe to comments for real-time updates
 */
export function subscribeToComments(requirementId, callback) {
  const commentsRef = fsCollection(db, 'requirements', requirementId, 'comments');
  const q = fsQuery(commentsRef, fsOrderBy('createdAt'));
  return onSnapshot(q, (snapshot) => {
    const comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(comments);
  });
}