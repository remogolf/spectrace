<script>
  import RequirementTreeNode from './RequirementTreeNode.svelte';
  import { createEventDispatcher } from 'svelte';
  import { moveRequirement } from './requirementsService.js';

  export let requirements = [];
  export let activeRequirementId = null;
  export let loading = false;
  export let userId = null;
  export let projectId = null;

  const dispatch = createEventDispatcher();
  
  let isDraggingActive = false;
  let isRootDropTarget = false;
  
  // Function to signal drag is active - called from child nodes
  function setDraggingActive(event) {
    isDraggingActive = true;
  }
  
  // Function to signal drag has ended - called from child nodes
  function setDraggingInactive(event) {
    isDraggingActive = false;
    setTimeout(() => {
      // Extra safety to ensure we reset the state
      isRootDropTarget = false;
    }, 200);
  }

  // Organize requirements into a hierarchical structure
  $: hierarchicalRequirements = buildHierarchy(requirements);

  function buildHierarchy(reqs) {
    // Create a map of all requirements by ID
    const reqMap = new Map();
    reqs.forEach(req => {
      reqMap.set(req.id, { ...req, children: [] });
    });
    
    // Create the tree structure
    const rootRequirements = [];
    
    reqMap.forEach(req => {
      if (!req.parentId) {
        // This is a root level requirement
        rootRequirements.push(req);
      } else {
        // This is a child requirement
        const parent = reqMap.get(req.parentId);
        if (parent) {
          parent.children.push(req);
        } else {
          // Parent not found, treat as root
          rootRequirements.push(req);
        }
      }
    });
    
    // Sort root requirements and their children
    return sortRequirements(rootRequirements);
  }

  function sortRequirements(reqs) {
    // Sort by hierarchical path if available, or fall back to order
    reqs.sort((a, b) => {
      // First try to sort by hierarchicalPath
      if (a.hierarchicalPath && b.hierarchicalPath) {
        return a.hierarchicalPath.localeCompare(b.hierarchicalPath, undefined, 
          { numeric: true, sensitivity: 'base' });
      }
      
      // Next try to sort by order
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      
      // Fall back to position (legacy)
      if (a.position !== undefined && b.position !== undefined) {
        return a.position - b.position;
      }
      
      // Last resort: sort by createdAt
      return new Date(a.createdAt?.toDate?.() || a.createdAt) - 
             new Date(b.createdAt?.toDate?.() || b.createdAt);
    });
    
    // Sort children recursively
    reqs.forEach(req => {
      if (req.children && req.children.length) {
        req.children = sortRequirements(req.children);
      }
    });
    
    return reqs;
  }

  function handleNodeClick(event) {
    dispatch('selectRequirement', event.detail);
  }

  function handleAddChild(event) {
    dispatch('addChild', event.detail);
  }
  
  function handleShowDetails(event) {
    dispatch('showDetails', event.detail);
  }
  
  // Handle drag and drop events
  async function handleDrop(event) {
    const { sourceId, targetId, position } = event.detail;
    
    try {
      // Find the source and target requirements
      const sourceReq = findRequirementById(requirements, sourceId);
      const targetReq = findRequirementById(requirements, targetId);
      
      if (!sourceReq || !targetReq) {
        console.error('Source or target requirement not found');
        return;
      }
      
      // Get the siblings at the target level
      let newParentId = null;
      let siblings = [];
      let newOrder = 1;
      
      switch (position) {
        case 'top':
          // Insert before target as a sibling
          newParentId = targetReq.parentId;
          siblings = requirements.filter(r => r.parentId === newParentId);
          // Get the position before the target
          if (targetReq.order !== undefined) {
            // We need to update other siblings to make room
            siblings.forEach(sib => {
              if (sib.order >= targetReq.order && sib.id !== sourceId) {
                sib.order += 1;
              }
            });
            newOrder = targetReq.order;
          }
          break;
        
        case 'middle':
          // Make it a child of the target
          newParentId = targetId;
          siblings = requirements.filter(r => r.parentId === newParentId);
          newOrder = siblings.length + 1;
          break;
        
        case 'bottom':
          // Insert after target as a sibling
          newParentId = targetReq.parentId;
          siblings = requirements.filter(r => r.parentId === newParentId);
          // Get the position after the target
          if (targetReq.order !== undefined) {
            // Add it immediately after the target
            siblings.forEach(sib => {
              if (sib.order > targetReq.order && sib.id !== sourceId) {
                sib.order += 1;
              }
            });
            newOrder = targetReq.order + 1;
          }
          break;
      }
      
      // Move the requirement
      console.log(`Moving requirement ${sourceId} to parent=${newParentId}, order=${newOrder}`);
      await moveRequirement({
        requirementId: sourceId,
        newParentId,
        newOrder,
        userId
      });
      
      // Notify parent component of the change
      dispatch('requirementMoved', { 
        requirementId: sourceId, 
        newParentId, 
        newOrder 
      });
    } catch (error) {
      console.error('Error moving requirement:', error);
      alert(`Failed to move requirement: ${error.message}`);
    }
  }
  
  // Helper function to find a requirement by ID (including in children)
  function findRequirementById(reqs, id) {
    for (const req of reqs) {
      if (req.id === id) {
        return req;
      }
      
      // Search in children recursively
      if (req.children && req.children.length > 0) {
        const found = findRequirementById(req.children, id);
        if (found) {
          return found;
        }
      }
    }
    
    return null;
  }

  // Root level drag and drop handlers
  function handleRootDragOver(event) {
    event.preventDefault();
    
    if (event.dataTransfer.types.includes('application/json')) {
      event.dataTransfer.dropEffect = 'move';
      isRootDropTarget = true;
    }
  }
  
  function handleRootDragLeave() {
    isRootDropTarget = false;
  }
  
  function handleRootDrop(event) {
    event.preventDefault();
    isRootDropTarget = false;
    
    if (event.dataTransfer.types.includes('application/json')) {
      const data = JSON.parse(event.dataTransfer.getData('application/json'));
      const sourceId = data.id;
      
      // Find the maximum order among root items
      const rootItems = requirements.filter(r => !r.parentId);
      const maxOrder = rootItems.length > 0 
        ? Math.max(...rootItems.map(r => r.order || 0)) 
        : 0;
      
      // Place this item at the end of root items
      try {
        moveRequirement({
          requirementId: sourceId,
          newParentId: null, // null parent means root level
          newOrder: maxOrder + 1,
          userId
        });
        
        // Notify parent component of the change
        dispatch('requirementMoved', { 
          requirementId: sourceId, 
          newParentId: null,
          newOrder: maxOrder + 1
        });
      } catch (error) {
        console.error('Error moving requirement to root:', error);
        alert(`Failed to move requirement: ${error.message}`);
      }
    }
  }
</script>

<div class="h-full overflow-auto bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col">
  <div class="p-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
    <h3 class="text-md font-medium text-gray-900">Requirements</h3>
    <div class="flex space-x-2">
      <!-- Any additional filters or views could go here -->
      <button 
        on:click={() => dispatch('addRoot')}
        class="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <svg class="-ml-0.5 mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
        </svg>
        Add Root
      </button>
    </div>
  </div>

  <!-- Tree headers - Wrike-like column header row -->
  <div class="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 flex items-center py-2">
    <div class="w-8"><!-- Drag handle column --></div>
    <div class="flex-grow pl-6">Name</div>
    <div class="w-24 text-center">Status</div>
    <div class="w-32"><!-- Actions column --></div>
  </div>

  <div class="flex-grow overflow-auto relative">
    <!-- Add a root-level drop zone with improved styling -->
    <div 
      class="absolute inset-0 pointer-events-none transition-all duration-200 z-10" 
      class:pointer-events-auto={isDraggingActive}
      on:dragover={handleRootDragOver}
      on:dragleave={handleRootDragLeave}
      on:drop={handleRootDrop}
      class:root-drop-active={isRootDropTarget}
    >
      {#if isRootDropTarget}
        <div class="absolute inset-x-0 bottom-0 text-center py-4 text-blue-600 font-medium text-sm bg-blue-50 bg-opacity-80">
          <span class="inline-flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
            Drop here to add to root level
          </span>
        </div>
      {/if}
    </div>

    {#if loading}
      <div class="flex justify-center items-center py-8">
        <div class="h-6 w-6 rounded-full border-2 border-gray-300 border-t-blue-600 animate-spin"></div>
        <span class="ml-2 text-sm text-gray-500">Loading requirements...</span>
      </div>
    {:else if hierarchicalRequirements.length === 0}
      <div class="text-center py-8 px-4">
        <svg class="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">No requirements</h3>
        <p class="mt-1 text-sm text-gray-500">Get started by creating a new requirement.</p>
      </div>
    {:else}
      <div>
        {#each hierarchicalRequirements as requirement}
          <RequirementTreeNode 
            requirement={requirement} 
            level={0} 
            activeId={activeRequirementId}
            on:click={handleNodeClick}
            on:addChild={handleAddChild}
            on:drop={handleDrop}
            on:showDetails={handleShowDetails}
            on:dragstart={setDraggingActive}
            on:dragend={setDraggingInactive}
          />
        {/each}
      </div>
    {/if}
  </div>
  
  <!-- Add item button at the bottom of the list -->
  <div class="border-t border-gray-200 p-2 bg-gray-50">
    <button 
      on:click={() => dispatch('addRoot')}
      class="flex items-center justify-center w-full py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
    >
      <svg class="mr-1 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
      </svg>
      Add item
    </button>
  </div>
</div>

<style>
  .root-drop-active {
    background-color: rgba(59, 130, 246, 0.1);
    border: 2px dashed #3b82f6;
  }
</style>
