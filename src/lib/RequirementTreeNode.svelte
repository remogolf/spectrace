<script>
  import { createEventDispatcher } from 'svelte';
  import { slide } from 'svelte/transition';

  export let requirement;
  export let level = 0;
  export let activeId = null;
  export let dropPreview = null;

  const dispatch = createEventDispatcher();
  
  // State for expand/collapse
  let expanded = true;
  let isDragging = false;
  let isOver = false;
  let overPosition = 'middle'; // 'top', 'middle', or 'bottom'
  
  // Status badge colors
  const statusColors = {
    draft: 'bg-yellow-100 text-yellow-800',
    review: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    implemented: 'bg-purple-100 text-purple-800',
    // Default color if status is not recognized
    default: 'bg-gray-100 text-gray-800'
  };
  
  // Get the CSS class for the current status
  $: statusClass = statusColors[requirement.status?.toLowerCase()] || statusColors.default;
  
  // Add cursor information to clearly indicate draggable elements
  $: dragHandleClass = isDragging ? 'cursor-grabbing' : 'cursor-grab';
  
  // Dynamic border classes when dragging over this element
  $: borderClasses = isOver ? 
    overPosition === 'middle' ? 'bg-blue-50 outline outline-2 outline-blue-400' :
    'bg-white' : 'bg-white';
  
  // Handle clicks on the requirement
  function handleClick(event) {
    // If we're dragging, don't process the click
    if (isDragging) return;
    
    // Dispatch the click event with the requirement
    dispatch('click', requirement);
  }
  
  // Toggle expanded state
  function toggleExpanded(event) {
    event.stopPropagation();
    expanded = !expanded;
  }
  
  // Add child requirement
  function addChild(event) {
    event.stopPropagation();
    dispatch('addChild', requirement);
  }
  
  // Show details panel
  function showDetails(event) {
    event.stopPropagation();
    dispatch('showDetails', requirement);
  }
  
  // Compute indent based on level (excluding the leftmost handle + expand area)
  $: indentClass = `ml-${Math.min(level * 6, 24)}`;
  
  // Drag and drop handlers
  function handleDragStart(event) {
    event.stopPropagation();
    isDragging = true;
    
    // Set the drag data
    event.dataTransfer.setData('application/json', JSON.stringify({
      id: requirement.id,
      name: requirement.title || requirement.name,
      level: level,
      parentId: requirement.parentId
    }));
    
    event.dataTransfer.effectAllowed = 'move';
    
    // Set dragImage to make dragging more visual
    const dragEl = event.currentTarget.cloneNode(true);
    dragEl.style.width = `${event.currentTarget.offsetWidth}px`;
    dragEl.style.backgroundColor = 'white';
    dragEl.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
    dragEl.style.position = 'absolute';
    dragEl.style.top = '-1000px';
    dragEl.style.opacity = '0.8';
    document.body.appendChild(dragEl);
    
    event.dataTransfer.setDragImage(dragEl, 20, 20);
    
    // Cleanup the element after a short delay
    setTimeout(() => {
      document.body.removeChild(dragEl);
    }, 100);
    
    // Notify parent that dragging has started
    dispatch('dragstart');
  }
  
  function handleDragEnd() {
    // Use setTimeout to prevent the click event from firing immediately after drag ends
    setTimeout(() => {
      isDragging = false;
    }, 100);
    
    // Notify parent that dragging has ended
    dispatch('dragend');
  }
  
  function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    
    // We can't rely on getData during dragover, so we need to use the dropPreview
    if (!dropPreview?.sourceId) {
      return; // No active drag operation or source ID
    }
    
    // Prevent dropping onto itself
    if (dropPreview.sourceId === requirement.id) {
      event.dataTransfer.dropEffect = 'none';
      return;
    }
    
    event.dataTransfer.dropEffect = 'move';
    
    // Calculate position logic
    const rect = event.currentTarget.getBoundingClientRect();
    const y = event.clientY - rect.top;
    let newOverPosition = 'middle';
    
    // More precise zones for better usability
    if (y < rect.height * 0.25) {
      newOverPosition = 'top';
    } else if (y > rect.height * 0.75) {
      newOverPosition = 'bottom';
    }
    
    // Only update if changed to reduce flicker
    if (!isOver || overPosition !== newOverPosition) {
      isOver = true;
      overPosition = newOverPosition;
      
      // Emit dropPreview event to parent component
      dispatch('dropPreview', {
        sourceId: dropPreview.sourceId,
        targetId: requirement.id,
        position: overPosition,
        parentId: requirement.parentId
      });
    }
  }
  
  function handleDragLeave() {
    isOver = false;
    dispatch('clearDropPreview');
  }
  
  function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    isOver = false;
    
    if (event.dataTransfer.types.includes('application/json')) {
      const data = JSON.parse(event.dataTransfer.getData('application/json'));
      
      // Don't allow dropping on self
      if (data.id === requirement.id) {
        return;
      }
      
      // Dispatch the drop event with the source and target info
      dispatch('drop', {
        sourceId: data.id,
        targetId: requirement.id,
        position: overPosition
      });
    }
  }

  // Forwarding dropPreview and clearDropPreview events to the parent
  function handleDropPreview(event) {
    dispatch('dropPreview', event.detail);
  }
  
  function handleClearDropPreview() {
    dispatch('clearDropPreview');
  }

  // Compute classes for drop indicators
  $: dropIndicatorClasses = {
    top: isOver && overPosition === 'top' ? 'drop-indicator-top active' : 'drop-indicator-top',
    middle: isOver && overPosition === 'middle' ? 'drop-indicator-middle active' : 'drop-indicator-middle',
    bottom: isOver && overPosition === 'bottom' ? 'drop-indicator-bottom active' : 'drop-indicator-bottom'
  };

  // Add a visible drag handle icon and tooltip
  const dragHandleIcon = `<svg width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg"><g stroke="#6B7280" stroke-width="2" stroke-linecap="round"><path d="M5 4h.01M5 8h.01M5 12h.01M11 4h.01M11 8h.01M11 12h.01"/></g></svg>`;
</script>

<div 
  role="button"
  class="requirement-node flex py-2 hover:bg-gray-50 relative {borderClasses} {isDragging ? 'dragging' : ''} {dropPreview && dropPreview.targetId === requirement.id && dropPreview.position === 'middle' ? 'drop-preview-nest' : ''}"
  class:active={activeId === requirement.id}
  on:click={handleClick}
  on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(e); }}
  on:dragover={handleDragOver}
  on:dragleave={handleDragLeave}
  on:drop={handleDrop}
  aria-dropeffect="move"
  aria-label="Requirement {requirement.title || requirement.name}"
  tabindex="0"
>
  <!-- Drop indicators with improved visibility and labels -->
  <div class={dropIndicatorClasses.top}></div>
  
  <div class={dropIndicatorClasses.middle}></div>
  
  <div class={dropIndicatorClasses.bottom}></div>
  
  {#if isOver && overPosition === 'middle' || (dropPreview && dropPreview.targetId === requirement.id && dropPreview.position === 'middle')}
    <div class="drop-preview-nest-label" transition:slide>Nest inside</div>
  {/if}
  {#if isOver && overPosition === 'top' || (dropPreview && dropPreview.targetId === requirement.id && dropPreview.position === 'top')}
    <div class="drop-preview-bar-label top-label" transition:slide>Move above</div>
  {/if}
  {#if isOver && overPosition === 'bottom' || (dropPreview && dropPreview.targetId === requirement.id && dropPreview.position === 'bottom')}
    <div class="drop-preview-bar-label bottom-label" transition:slide>Move below</div>
  {/if}
  
  <!-- Expand/collapse toggle for items with children -->
  <div class="flex-shrink-0 w-5 flex items-center {indentClass}">
    {#if requirement.children && requirement.children.length > 0}
      <button 
        on:click={toggleExpanded} 
        class="h-5 w-5 flex items-center justify-center text-gray-400 hover:text-gray-700 focus:outline-none"
        aria-label={expanded ? 'Collapse children' : 'Expand children'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 transition-transform duration-200" class:rotate-90={expanded} viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
        </svg>
      </button>
    {/if}
  </div>
  
  <!-- Requirement title and content area -->
  <div class="flex-grow min-w-0 pr-4">
    <div class="flex items-center">
      <!-- Add the hierarchical path/ID back -->
      {#if requirement.hierarchicalPath}
        <span class="text-xs font-mono text-gray-500 mr-2">
          {requirement.hierarchicalPath}
        </span>
      {/if}
      <span class="text-sm font-medium text-gray-900 truncate">
        {requirement.title || requirement.name}
      </span>
    </div>
    {#if requirement.description}
      <p class="mt-1 text-xs text-gray-500 truncate">
        {requirement.description}
      </p>
    {/if}
  </div>
  
  <!-- Status badge -->
  <div class="flex-shrink-0 w-24 flex justify-center">
    {#if requirement.status}
      <span class="px-2 py-1 text-xs rounded-full whitespace-nowrap {statusClass}">
        {requirement.status}
      </span>
    {/if}
  </div>
  
  <!-- Actions area -->
  <div class="flex-shrink-0 w-32 flex items-center justify-end pr-4 space-x-2">
    <button 
      on:click={showDetails}
      class="h-7 w-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 focus:outline-none"
      title="View Details"
      aria-label="View Details"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
        <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
      </svg>
    </button>
    
    <button 
      on:click={addChild}
      class="h-7 w-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 focus:outline-none"
      title="Add Child"
      aria-label="Add Child"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" />
      </svg>
    </button>
  </div>
</div>

<!-- Child requirements if expanded -->
{#if expanded && requirement.children && requirement.children.length > 0}
  <div class="children" transition:slide={{ duration: 200 }}>
    {#each requirement.children as child}
      <svelte:self 
        requirement={child} 
        level={level + 1} 
        activeId={activeId}
        on:click
        on:addChild
        on:showDetails
        on:drop
        on:dragstart
        on:dragend
        on:dropPreview={handleDropPreview}
        on:clearDropPreview={handleClearDropPreview}
      />
    {/each}
  </div>
{/if}

<style>
  .requirement-node {
    transition: background-color 0.2s, box-shadow 0.2s;
  }
  
  .requirement-node.active {
    background-color: #f0f7ff;
    border-left: 3px solid #3b82f6;
  }
  
  .requirement-node.dragging {
    opacity: 0.7;
    transform: scale(0.98);
    box-shadow: 0 4px 16px 0 rgba(59, 130, 246, 0.15);
    z-index: 20;
    transition: opacity 0.15s, transform 0.15s, box-shadow 0.15s;
  }
  
  /* Enhanced drop indicators */
  .drop-indicator-top, .drop-indicator-bottom {
    position: absolute;
    left: 0;
    right: 0;
    height: 4px;
    background-color: #3b82f6;
    border-radius: 2px;
    pointer-events: none;
    z-index: 10;
    box-shadow: 0 0 4px rgba(59, 130, 246, 0.5);
  }
  
  .drop-indicator-top {
    top: -2px;
  }
  
  .drop-indicator-bottom {
    bottom: -2px;
  }
  
  .drop-indicator-top.active, .drop-indicator-bottom.active {
    background-color: #3b82f6;
  }
  
  .drop-indicator-middle {
    position: absolute;
    inset: 0;
    pointer-events: none;
    border: 2px dashed #3b82f6;
    border-radius: 4px;
    z-index: 5;
    background-color: rgba(59, 130, 246, 0.08);
  }
  
  .drop-indicator-middle.active {
    border-color: #3b82f6;
    background-color: rgba(59, 130, 246, 0.12);
  }
  
  .drop-preview-nest {
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
    background: rgba(79, 70, 229, 0.06);
    position: relative;
  }
  
  .drop-preview-nest-label {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    background: #4f46e5;
    color: #fff;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.8em;
    pointer-events: none;
    z-index: 30;
    opacity: 0.95;
    box-shadow: 0 2px 8px 0 rgba(99,102,241,0.25);
    white-space: nowrap;
  }

  .drag-handle {
    opacity: 0.7;
    transition: opacity 0.15s;
  }
  .group:hover .drag-handle, .drag-handle:focus {
    opacity: 1;
  }
  .drop-preview-bar-label {
    position: absolute;
    left: 50%;
    top: 0;
    transform: translate(-50%, -120%);
    background: #3b82f6;
    color: #fff;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.8em;
    pointer-events: none;
    z-index: 30;
    opacity: 0.95;
    box-shadow: 0 2px 8px 0 rgba(59,130,246,0.25);
    white-space: nowrap;
  }
  .drop-preview-bar-label:last-of-type {
    top: auto;
    bottom: 0;
    transform: translate(-50%, 120%);
  }
</style>