<script>
  import RequirementTree from '$lib/RequirementTree.svelte';
  import RequirementDetail from '$lib/RequirementDetail.svelte';
  import { onMount, tick } from 'svelte';
  import { getProject } from '$lib/projectsService';
  import { getRequirements, createRequirement } from '$lib/requirementsService';
  import { auth } from '$lib/firebase';
  import { onAuthStateChanged } from 'firebase/auth';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onSnapshot, query, where, orderBy, collection } from 'firebase/firestore';
  import { db } from '$lib/firebase.js';
  import { fly } from 'svelte/transition';

  let project = null;
  let requirements = [];
  let selectedRequirement = null;
  let loading = true;
  let error = null;
  let unsubscribe = null;
  let user = null;
  
  // UI state
  let filterText = '';
  let sectionFilter = '';
  let statusFilter = '';
  let tagFilter = '';
  let assigneeFilter = '';
  let isDetailsVisible = false;
  let isCreatingRequirement = false;
  let newRequirementTitle = '';
  let newRequirementParentId = null;
  let isFullscreenDetails = false;

  const projectId = $page.params.id;

  onMount(() => {
    let loadingTimeout = setTimeout(() => {
      if (loading) {
        error = 'Loading timed out. Please check your connection or permissions.';
        loading = false;
      }
    }, 10000); // 10 seconds

    const authUnsubscribe = onAuthStateChanged(auth, async (userData) => {
      if (!userData) {
        loading = false;
        goto('/login');
        return;
      }
      
      user = userData;
      
      try {
        loading = true;
        console.log('Loading project data for ID:', projectId);
        project = await getProject(projectId);
        console.log('Project loaded:', project);
        
        if (!project) {
          error = "Project not found";
          loading = false;
          clearTimeout(loadingTimeout);
          return;
        }
        
        // Setup real-time requirements listener
        const requirementsRef = collection(db, 'requirements');
        const q = query(
          requirementsRef, 
          where('projectId', '==', projectId), 
          orderBy('hierarchicalPath')
        );
        
        unsubscribe = onSnapshot(q, (snapshot) => {
          console.log('Requirements snapshot received:', snapshot.size);
          requirements = snapshot.docs.map(doc => ({
            id: doc.id, 
            ...doc.data()
          }));
          loading = false;
          clearTimeout(loadingTimeout);
        }, (err) => {
          console.error('Snapshot error:', err);
          error = `Error loading requirements: ${err.message}`;
          loading = false;
          clearTimeout(loadingTimeout);
        });
      } catch (err) {
        console.error('Error loading project:', err);
        error = err.message;
        loading = false;
        clearTimeout(loadingTimeout);
      }
    });

    return () => {
      authUnsubscribe();
      if (unsubscribe) unsubscribe();
      clearTimeout(loadingTimeout);
    };
  });

  // Filter the requirements
  $: filteredRequirements = requirements.filter(r => {
    const matchesSearch = !filterText || 
      r.title?.toLowerCase().includes(filterText.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(filterText.toLowerCase()));
    
    const matchesSection = !sectionFilter || r.section === sectionFilter;
    const matchesStatus = !statusFilter || r.status === statusFilter;
    const matchesTag = !tagFilter || (r.tags && r.tags.includes(tagFilter));
    const matchesAssignee = !assigneeFilter || r.assigneeId === assigneeFilter;
    
    return matchesSearch && matchesSection && matchesStatus && matchesTag && matchesAssignee;
  });

  // Extract options for filters
  $: sectionOptions = Array.from(new Set(requirements
    .map(r => r.section)
    .filter(Boolean)
  ));
  
  $: statusOptions = Array.from(new Set(requirements
    .map(r => r.status)
    .filter(Boolean)
  ));
  
  $: tagOptions = Array.from(new Set(requirements
    .flatMap(r => r.tags || [])
    .filter(Boolean)
  ));
  
  $: assigneeOptions = Array.from(new Set(requirements
    .map(r => r.assigneeId)
    .filter(Boolean)
  ));

  async function selectRequirement(reqOrId) {
    // Handle both cases - when passed a requirement ID (string) or a requirement object
    const reqId = typeof reqOrId === 'string' ? reqOrId : reqOrId?.id;
    
    if (!reqId) return;
    
    // Find the requirement by ID
    const req = requirements.find(r => r.id === reqId);
    if (req) {
      selectedRequirement = req;
      await tick();
      isDetailsVisible = true;
      isFullscreenDetails = false; // Reset to split view when selecting a new requirement
    }
  }

  function closeDetails() {
    isDetailsVisible = false;
  }

  function toggleFullscreenDetails() {
    isFullscreenDetails = !isFullscreenDetails;
  }

  function startNewRequirement(parentReq = null) {
    newRequirementParentId = parentReq?.id || null;
    newRequirementTitle = '';
    isCreatingRequirement = true;
  }

  async function createNewRequirement() {
    if (!newRequirementTitle.trim()) return;
    
    try {
      const parentRequirement = newRequirementParentId ? 
        requirements.find(r => r.id === newRequirementParentId) : null;
      
      const level = parentRequirement ? parentRequirement.level + 1 : 0;
      
      await createRequirement({
        title: newRequirementTitle,
        description: '',
        status: 'draft',
        section: parentRequirement?.section || 'Uncategorized',
        projectId,
        parentId: newRequirementParentId,
        level,
        userId: user.uid
      });
      
      // Reset form
      isCreatingRequirement = false;
      newRequirementTitle = '';
    } catch (err) {
      console.error('Error creating requirement:', err);
      error = `Failed to create requirement: ${err.message}`;
    }
  }

  function cancelNewRequirement() {
    isCreatingRequirement = false;
    newRequirementTitle = '';
  }

  function handleRequirementMoved(event) {
    console.log('Requirement moved:', event.detail);
    // The real-time listener will update the UI automatically
  }

  function getStatusClass(status) {
    switch(status) {
      case 'draft': return 'bg-gray-200 text-gray-800';
      case 'review': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-200 text-gray-800';
    }
  }

  function viewDetailPage(requirementId) {
    // Navigate to the full detail page for this requirement
    goto(`/projects/${projectId}/requirements/${requirementId}`);
  }
</script>

<div class="min-h-screen bg-gray-50 flex flex-col">
  {#if loading}
    <div class="flex-1 flex items-center justify-center">
      <div class="animate-pulse flex space-x-4 items-center">
        <div class="h-3 w-3 bg-blue-600 rounded-full"></div>
        <div class="h-3 w-3 bg-blue-600 rounded-full"></div>
        <div class="h-3 w-3 bg-blue-600 rounded-full"></div>
        <span class="text-gray-600 font-medium">Loading project...</span>
      </div>
    </div>
  {:else if error}
    <div class="flex-1 p-6 flex items-center justify-center">
      <div class="bg-red-50 border-l-4 border-red-400 p-4 rounded max-w-lg w-full">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    </div>
  {:else if project}
    <div class="flex-1 flex flex-col relative">
      <!-- Project name banner -->
      <div class="bg-white border-b border-gray-200 w-full py-3 px-4 mb-3 shadow-sm">
        <h2 class="text-lg font-medium text-gray-900">{project.name}</h2>
      </div>
      
      <!-- Main content with flexible layout -->
      <div class="flex-1 p-6 flex overflow-hidden">
        <!-- Tree view - adjusts width when details panel is open -->
        <div class="{isDetailsVisible ? (isFullscreenDetails ? 'w-0 opacity-0' : 'w-2/5') : 'w-full'} flex flex-col transition-all duration-300 ease-in-out mr-0 md:mr-4 overflow-auto" 
             class:hidden={isDetailsVisible && isFullscreenDetails}>
          <!-- Filters -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
            <div class="flex flex-col space-y-3">
              <input 
                type="text" 
                placeholder="Search requirements..." 
                bind:value={filterText}
                class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              
              <div class="grid grid-cols-2 gap-2">
                <select 
                  bind:value={sectionFilter}
                  class="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">All Sections</option>
                  {#each sectionOptions as section}
                    <option value={section}>{section}</option>
                  {/each}
                </select>
                
                <select 
                  bind:value={statusFilter}
                  class="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">All Statuses</option>
                  {#each statusOptions as status}
                    <option value={status}>{status}</option>
                  {/each}
                </select>
              </div>
              
              <div class="grid grid-cols-2 gap-2">
                <select 
                  bind:value={tagFilter}
                  class="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">All Tags</option>
                  {#each tagOptions as tag}
                    <option value={tag}>{tag}</option>
                  {/each}
                </select>
                
                <select 
                  bind:value={assigneeFilter}
                  class="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">All Assignees</option>
                  {#each assigneeOptions as assignee}
                    <option value={assignee}>{assignee}</option>
                  {/each}
                </select>
              </div>
            </div>
          </div>
          
          <!-- Requirements Tree -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 overflow-hidden">
            {#if isCreatingRequirement && !newRequirementParentId}
              <div class="m-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <input 
                  type="text" 
                  bind:value={newRequirementTitle}
                  placeholder="New requirement title..."
                  class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-2"
                  autofocus
                />
                <div class="flex justify-end space-x-2">
                  <button 
                    on:click={cancelNewRequirement}
                    class="px-2 py-1 text-xs text-gray-700 bg-white border border-gray-300 rounded"
                  >
                    Cancel
                  </button>
                  <button 
                    on:click={createNewRequirement}
                    class="px-2 py-1 text-xs text-white bg-blue-600 rounded hover:bg-blue-700"
                  >
                    Create
                  </button>
                </div>
              </div>
            {/if}
            
            <RequirementTree 
              requirements={filteredRequirements}
              activeRequirementId={selectedRequirement?.id}
              loading={loading}
              userId={user?.uid}
              projectId={projectId}
              isCreatingRequirement={isCreatingRequirement}
              newRequirementParentId={newRequirementParentId}
              newRequirementTitle={newRequirementTitle}
              on:selectRequirement={(event) => selectRequirement(event.detail)}
              on:showDetails={(event) => selectRequirement(event.detail)}
              on:addChild={(event) => startNewRequirement(event.detail)}
              on:addRoot={() => startNewRequirement(null)}
              on:cancelNewRequirement={cancelNewRequirement}
              on:createNewRequirement={createNewRequirement}
              on:requirementMoved={handleRequirementMoved}
            />
            
            {#if requirements.length === 0 && !loading}
              <div class="text-center py-8">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 class="text-lg font-medium text-gray-900 mb-1">No requirements yet</h3>
                <p class="text-gray-500 mb-4">Get started by creating your first requirement</p>
                <button 
                  on:click={() => startNewRequirement(null)}
                  class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Create first requirement
                </button>
              </div>
            {/if}
          </div>
        </div>
        
        <!-- Details panel - slides in from right but doesn't cover tree view -->
        {#if isDetailsVisible && selectedRequirement}
          <div 
            class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-auto transition-all duration-300 ease-in-out ml-auto {isFullscreenDetails ? 'w-full' : 'w-3/5'}"
            transition:fly={{ x: 300, duration: 300, opacity: 1 }}
          >
            <div class="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center">
              <h2 class="text-lg font-medium text-gray-900 truncate">
                {selectedRequirement.title || selectedRequirement.name}
              </h2>
              <div class="flex items-center">
                <!-- Toggle full screen button -->
                <button 
                  on:click={toggleFullscreenDetails}
                  class="text-gray-500 hover:text-blue-600 focus:outline-none mr-2"
                  title={isFullscreenDetails ? "Exit full view" : "Full view"}
                >
                  {#if isFullscreenDetails}
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clip-rule="evenodd" />
                    </svg>
                  {:else}
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clip-rule="evenodd" />
                    </svg>
                  {/if}
                </button>
                <!-- Open in dedicated page button -->
                <button 
                  on:click={() => viewDetailPage(selectedRequirement.id)}
                  class="text-gray-500 hover:text-blue-600 focus:outline-none mr-2"
                  title="Open in dedicated page"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                  </svg>
                </button>
                <!-- Close button -->
                <button 
                  on:click={closeDetails}
                  class="text-gray-500 hover:text-gray-700 focus:outline-none"
                  title="Close panel"
                >
                  <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div class="p-4">
              <RequirementDetail 
                requirement={selectedRequirement} 
                project={project}
                userId={user?.uid} 
              />
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  /* Add transitions for smooth panel resizing */
  :global(.requirement-detail-panel) {
    transition: all 0.3s ease-in-out;
  }
</style>