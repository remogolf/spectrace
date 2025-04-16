<script>
  import { createEventDispatcher, tick } from 'svelte';
  import { slide, fade } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  
  // Custom action to focus element after mount
  const autoFocus = (node) => {
    node.focus();
  };

  export let req; // The requirement object
  export let selectedRequirement = null;
  export let expandedItems = new Set();
  export let requirementsByParent = {};
  export let getStatusClass;
  export let isCreatingRequirement = false;
  export let newRequirementParentId = null;
  export let newRequirementTitle = '';
  
  // Drag-and-drop state
  export let dragState = {};
  export let onDropPreview = () => {};
  export let onDrop = () => {};
  export let onDragStart = () => {};
  export let onDragEnd = () => {};

  let isDragging = false;
  let isOver = false;
  let overPosition = null; // 'top', 'middle', 'bottom'
  let dragHandleHovered = false;
  let itemElem;
  let dropDelayTimer = null;

  const dispatch = createEventDispatcher();
  
  function toggleExpand(id, event) {
    event.stopPropagation();
    dispatch('toggleExpand', id);
  }
  
  function selectRequirement(id, event) {
    event.stopPropagation();
    dispatch('selectRequirement', id);
  }
  
  function startNewRequirement(id, event) {
    event.stopPropagation();
    dispatch('startNewRequirement', id);
  }
  
  function cancelNewRequirement(event) {
    event.stopPropagation();
    dispatch('cancelNewRequirement');
  }
  
  function createNewRequirement(event) {
    event.stopPropagation();
    dispatch('createNewRequirement');
  }

  function handleDragStart(event) {
    isDragging = true;
    
    // Set the data in a consistent format
    event.dataTransfer.setData('application/json', JSON.stringify({ id: req.id }));
    event.dataTransfer.effectAllowed = 'move';
    
    // Create a custom drag image for better visual feedback
    const dragImage = itemElem.cloneNode(true);
    dragImage.style.width = `${itemElem.offsetWidth}px`;
    dragImage.style.opacity = '0.8';
    dragImage.style.backgroundColor = '#f3f4f6';
    dragImage.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    dragImage.style.borderRadius = '4px';
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    document.body.appendChild(dragImage);
    
    event.dataTransfer.setDragImage(dragImage, 20, 20);
    
    // Clean up the drag image after a delay
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 100);
    
    // IMPORTANT: This is where we notify the parent - must happen
    onDragStart(req.id);
  }

  function handleDragEnd(event) {
    isDragging = false;
    onDragEnd();
  }

  function handleDragOver(event) {
    event.preventDefault();
    
    // For dragover, we can't reliably access the data using getData
    // So we need to rely on the dragState passed from the parent
    if (!dragState.sourceId) {
      return; // No active drag in progress
    }
    
    // Prevent dropping onto itself
    if (dragState.sourceId === req.id) {
      event.dataTransfer.dropEffect = 'none';
      return;
    }
    
    event.dataTransfer.dropEffect = 'move';
    
    // Calculate position logic (keep existing)
    const rect = event.currentTarget.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const height = rect.height;
    
    let pos = 'middle';
    if (y < height * 0.3) pos = 'top';
    else if (y > height * 0.7) pos = 'bottom';
    
    // Always update the preview on dragover
    overPosition = pos;
    isOver = true;
    
    // This is critical - notify parent about the preview
    onDropPreview({ 
      sourceId: dragState.sourceId, 
      targetId: req.id, 
      position: pos 
    });
  }

  function handleDragLeave(event) {
    clearTimeout(dropDelayTimer);
    isOver = false;
    overPosition = null;
    onDropPreview(null);
  }

  function handleDrop(event) {
    event.preventDefault();
    clearTimeout(dropDelayTimer);
    
    try {
      // On drop, we can access the data
      const data = JSON.parse(event.dataTransfer.getData('application/json'));
      
      // Prevent dropping onto itself
      if (data.id !== req.id) {
        // Call the parent handler with the right parameters
        onDrop({ 
          sourceId: data.id, 
          targetId: req.id, 
          position: overPosition || 'middle' // Default to middle if position is not set
        });
      }
    } catch (e) {
      console.error('Error processing drop:', e);
      
      // Fallback to dragState if data parsing fails
      if (dragState.sourceId && dragState.sourceId !== req.id) {
        onDrop({
          sourceId: dragState.sourceId,
          targetId: req.id,
          position: overPosition || 'middle'
        });
      }
    }
    
    // Reset the visual state
    isOver = false;
    overPosition = null;
  }
  
  // Handle keyboard movement (accessibility)
  function handleKeyDown(event) {
    // Only handle if it's a key we care about
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(event.key)) {
      return;
    }
    
    // If space or enter is pressed on the drag handle, show context menu instead of drag
    if ((event.key === 'Enter' || event.key === ' ') && document.activeElement.classList.contains('drag-handle-wrapper')) {
      event.preventDefault();
      
      // Show the context menu with movement options
      showMoveMenu();
      return;
    }
  }
  
  // Show a context menu with move options as an alternative to drag and drop
  function showMoveMenu() {
    const menuOptions = [
      { label: 'Move up', action: 'move-up' },
      { label: 'Move down', action: 'move-down' },
      { label: 'Nest under previous item', action: 'nest' },
      { label: 'Un-nest (move to parent level)', action: 'unnest' }
    ];
    
    // Create a simple UI menu for movement - this could be enhanced or replaced with a proper UI component
    const menuEl = document.createElement('div');
    menuEl.className = 'move-context-menu';
    menuEl.style.position = 'absolute';
    menuEl.style.zIndex = '100';
    menuEl.style.backgroundColor = 'white';
    menuEl.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
    menuEl.style.borderRadius = '4px';
    menuEl.style.padding = '4px 0';
    menuEl.style.minWidth = '180px';
    
    // Position next to the current item
    const rect = itemElem.getBoundingClientRect();
    menuEl.style.left = `${rect.right + 5}px`;
    menuEl.style.top = `${rect.top}px`;
    
    // Add menu items
    menuOptions.forEach(option => {
      const optionEl = document.createElement('div');
      optionEl.className = 'move-menu-item';
      optionEl.textContent = option.label;
      optionEl.style.padding = '8px 12px';
      optionEl.style.cursor = 'pointer';
      optionEl.style.fontSize = '14px';
      optionEl.style.color = '#374151';
      
      optionEl.addEventListener('mouseenter', () => {
        optionEl.style.backgroundColor = '#f3f4f6';
      });
      
      optionEl.addEventListener('mouseleave', () => {
        optionEl.style.backgroundColor = 'transparent';
      });
      
      optionEl.addEventListener('click', () => {
        handleMoveAction(option.action);
        document.body.removeChild(menuEl);
      });
      
      menuEl.appendChild(optionEl);
    });
    
    // Close menu when clicking outside
    const closeMenu = (e) => {
      if (!menuEl.contains(e.target)) {
        document.body.removeChild(menuEl);
        document.removeEventListener('click', closeMenu);
      }
    };
    
    // Add menu to body and set up click listener
    document.body.appendChild(menuEl);
    
    // Wait a tick before adding listener to prevent immediate close
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 10);
  }
  
  // Handle move actions from the context menu
  function handleMoveAction(action) {
    // Find current parent and siblings to calculate positions
    const parent = req.parentId;
    const siblings = parent ? requirementsByParent[parent] : requirementsByParent[null] || [];
    const currentIndex = siblings.findIndex(r => r.id === req.id);
    const prevSibling = currentIndex > 0 ? siblings[currentIndex - 1] : null;
    
    let targetId, position;
    
    switch (action) {
      case 'move-up':
        if (currentIndex > 0) {
          // Move above the previous sibling
          targetId = siblings[currentIndex - 1].id;
          position = 'top';
          onDrop({ sourceId: req.id, targetId, position });
        }
        break;
        
      case 'move-down':
        if (currentIndex < siblings.length - 1) {
          // Move below the next sibling
          targetId = siblings[currentIndex + 1].id;
          position = 'bottom';
          onDrop({ sourceId: req.id, targetId, position });
        }
        break;
        
      case 'nest':
        if (prevSibling) {
          // Nest under the previous sibling
          targetId = prevSibling.id;
          position = 'middle';
          onDrop({ sourceId: req.id, targetId, position });
        }
        break;
        
      case 'unnest':
        if (parent) {
          // Get the parent requirement
          const parentReq = requirements.find(r => r.id === parent);
          if (parentReq) {
            // Move after the parent
            targetId = parentReq.id;
            position = 'bottom';
            onDrop({ sourceId: req.id, targetId, position });
          }
        }
        break;
    }
  }
</script>

<li bind:this={itemElem}>
  <div
    role="treeitem"
    aria-selected={selectedRequirement === req.id}
    class="req-item flex items-center p-2 hover:bg-gray-50 rounded-md relative {selectedRequirement === req.id ? 'bg-blue-50 border-l-2 border-blue-500 pl-1' : ''}"
    class:is-over={isOver}
    class:drag-over-top={isOver && overPosition === 'top'}
    class:drag-over-middle={isOver && overPosition === 'middle'}
    class:drag-over-bottom={isOver && overPosition === 'bottom'}
    aria-grabbed={isDragging}
    aria-dropeffect="move"
    tabindex="0"
    on:keydown={handleKeyDown}
    on:dragover={handleDragOver}
    on:dragleave={handleDragLeave}
    on:drop={handleDrop}
  >
    <!-- Drag handle with improved affordance -->
    <button 
      type="button"
      class="drag-handle-wrapper flex items-center justify-center w-6 h-6 rounded-sm hover:bg-gray-200 focus:bg-gray-200 {dragHandleHovered ? 'bg-gray-200' : ''} mr-1 transition-colors"
      on:mouseenter={() => dragHandleHovered = true}
      on:mouseleave={() => dragHandleHovered = false}
      draggable="true"
      on:dragstart={handleDragStart}
      on:dragend={handleDragEnd}
      aria-label="Drag to reorder or nest"
      class:cursor-grab={!isDragging}
      class:cursor-grabbing={isDragging}
    >
      <div class="drag-handle text-gray-500">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="9" cy="5" r="1" />
          <circle cx="9" cy="12" r="1" />
          <circle cx="9" cy="19" r="1" />
          <circle cx="15" cy="5" r="1" />
          <circle cx="15" cy="12" r="1" />
          <circle cx="15" cy="19" r="1" />
        </svg>
      </div>
    </button>
    
    <!-- Expand/Collapse Button -->
    {#if requirementsByParent[req.id]?.length}
      <button 
        on:click={(event) => toggleExpand(req.id, event)}
        class="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        aria-label={expandedItems.has(req.id) ? "Collapse section" : "Expand section"}
      >
        {#if expandedItems.has(req.id)}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>
        {/if}
      </button>
    {:else}
      <div class="w-6 h-6"></div>
    {/if}
    
    <!-- Requirement Details -->
    <button 
      type="button"
      class="ml-1 flex-1 flex items-center justify-between cursor-pointer py-1 text-left"
      on:click={(event) => selectRequirement(req.id, event)}
      on:keydown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectRequirement(req.id, event);
        }
      }}
    >
      <div class="flex items-center overflow-hidden">
        <div class="font-mono text-xs text-gray-500 mr-2 flex-shrink-0">{req.hierarchicalPath || req.id.substring(0, 6)}</div>
        <div class="font-medium truncate">{req.title || req.name}</div>
      </div>
      
      {#if req.status}
        <span class="ml-2 px-2 py-0.5 text-xs rounded-full flex-shrink-0 {getStatusClass(req.status)}">
          {req.status}
        </span>
      {/if}
    </button>
    
    <!-- Add Child Button -->
    <button 
      on:click={(event) => startNewRequirement(req.id, event)}
      class="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ml-1"
      title="Add child requirement"
      aria-label="Add child requirement"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
        <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
      </svg>
    </button>

    <!-- Drop preview indicators with improved visibility and reduced flicker -->
    {#if isOver && overPosition === 'top'}
      <div 
        class="drop-indicator-top" 
        in:fade={{ duration: 150 }}
        out:fade={{ duration: 150 }}
      >
        <div class="drop-preview-pill">Move above</div>
      </div>
    {/if}
    
    {#if isOver && overPosition === 'bottom'}
      <div 
        class="drop-indicator-bottom" 
        in:fade={{ duration: 150 }}
        out:fade={{ duration: 150 }}
      >
        <div class="drop-preview-pill">Move below</div>
      </div>
    {/if}
    
    {#if isOver && overPosition === 'middle'}
    <div 
      class="drop-indicator-middle" 
      in:fade={{ duration: 150 }}
      out:fade={{ duration: 150 }}
    >
      <div class="drop-preview-nest-pill">Nest inside</div>
    </div>
  {/if}
  <!-- New requirement input section -->
  {#if isCreatingRequirement && newRequirementParentId === req.id}
    <input 
      type="text" 
      bind:value={newRequirementTitle}
      placeholder="New requirement title..."
      class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-2 focus:ring-blue-500 focus:border-blue-500"
      use:autoFocus
    />
    <div class="flex justify-end space-x-2">
      <button 
        on:click={cancelNewRequirement}
        class="px-3 py-1 text-xs text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
      >
        Cancel
      </button>
      <button 
        on:click={createNewRequirement}
        class="px-3 py-1 text-xs text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Create
      </button>
    </div>
  {/if}
  </div>
  
  <!-- Recursively render children -->
  {#if expandedItems.has(req.id) && requirementsByParent[req.id]?.length}
    <ul class="pl-6 mt-1 space-y-1 border-l border-gray-200 ml-3" transition:slide={{ duration: 200, easing: quintOut }}>
      {#each requirementsByParent[req.id] as childReq (childReq.id)}
        <svelte:self 
          req={childReq}
          {selectedRequirement}
          {expandedItems}
          {requirementsByParent}
          {getStatusClass}
          {isCreatingRequirement}
          {newRequirementParentId}
          {newRequirementTitle}
          {dragState}
          {onDropPreview}
          {onDrop}
          {onDragStart}
          {onDragEnd}
          on:toggleExpand
          on:selectRequirement
          on:startNewRequirement
          on:cancelNewRequirement
          on:createNewRequirement
        />
      {/each}
    </ul>
  {/if}
</li>

<style>
  .req-item {
    transition: all 180ms ease-out;
    border: 2px solid transparent;
  }
  
  .is-over {
    background-color: #f0f7ff !important;
  }
  
  .drag-over-top {
    box-shadow: 0 -2px 0 #3b82f6, 0 0 0 2px rgba(59, 130, 246, 0.1);
  }
  
  .drag-over-bottom {
    box-shadow: 0 2px 0 #3b82f6, 0 0 0 2px rgba(59, 130, 246, 0.1);
  }
  
  .drag-over-middle {
    border: 2px dashed #3b82f6;
    background-color: rgba(59, 130, 246, 0.1) !important;
  }
  
  .drag-handle {
    opacity: 0.6;
    transition: opacity 200ms ease;
  }
  
  .drag-handle-wrapper:hover .drag-handle,
  .drag-handle-wrapper:focus .drag-handle {
    opacity: 1;
  }
  
  .cursor-grab {
    cursor: grab;
  }
  
  .cursor-grabbing {
    cursor: grabbing;
  }
  
  /* Enhanced drop indicators with improved visibility */
  .drop-indicator-top,
  .drop-indicator-bottom {
    position: absolute;
    left: 0;
    right: 0;
    height: 4px;
    background-color: #3b82f6;
    z-index: 30;
    pointer-events: none;
    border-radius: 2px;
    box-shadow: 0 0 6px rgba(59, 130, 246, 0.5);
    animation: pulse 1.5s infinite;
  }
  
  .drop-indicator-top {
    top: -2px;
  }
  
  .drop-indicator-bottom {
    bottom: -2px;
  }
  
  .drop-indicator-middle {
    position: absolute;
    inset: 0;
    z-index: 20;
    pointer-events: none;
    background-color: rgba(59, 130, 246, 0.15);
    border: 2px dashed #3b82f6;
    border-radius: 4px;
    animation: borderPulse 1.5s infinite;
  }
  
  @keyframes pulse {
    0% { opacity: 0.7; }
    50% { opacity: 1; }
    100% { opacity: 0.7; }
  }
  
  @keyframes borderPulse {
    0% { border-color: rgba(59, 130, 246, 0.6); }
    50% { border-color: rgba(59, 130, 246, 1); }
    100% { border-color: rgba(59, 130, 246, 0.6); }
  }
  
  .drop-preview-pill {
    position: absolute;
    font-size: 0.7rem;
    background: #3b82f6;
    color: white;
    padding: 4px 10px;
    border-radius: 12px;
    left: 50%;
    transform: translateX(-50%);
    white-space: nowrap;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    z-index: 40;
    font-weight: 500;
  }
  
  .drop-indicator-top .drop-preview-pill {
    top: -24px;
  }
  
  .drop-indicator-bottom .drop-preview-pill {
    bottom: -24px;
  }
  
  .drop-preview-nest-pill {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    background: #6366f1;
    color: #fff;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 0.7rem;
    font-weight: 500;
    opacity: 0.95;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
    z-index: 40;
  }
</style>