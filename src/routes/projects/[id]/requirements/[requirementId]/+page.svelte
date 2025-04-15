<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { getProject } from '$lib/projectsService';
  import { getRequirement, updateRequirement, deleteRequirement } from '$lib/requirementsService';
  import RequirementDetail from '$lib/RequirementDetail.svelte';
  import { auth } from '$lib/firebase';
  import { onAuthStateChanged } from 'firebase/auth';

  const projectId = $page.params.id;
  const requirementId = $page.params.requirementId;
  
  let requirement = null;
  let project = null;
  let loading = true;
  let error = null;
  let user = null;
  let editing = false;

  onMount(() => {
    const authUnsubscribe = onAuthStateChanged(auth, async (userData) => {
      if (!userData) {
        goto('/login');
        return;
      }
      
      user = userData;
      
      try {
        loading = true;
        
        // Fetch project details
        project = await getProject(projectId);
        
        if (!project) {
          error = "Project not found";
          loading = false;
          return;
        }
        
        // Fetch requirement details
        requirement = await getRequirement(requirementId);
        
        if (!requirement) {
          error = "Requirement not found";
          loading = false;
          return;
        }
        
        loading = false;
      } catch (err) {
        console.error('Error loading data:', err);
        error = err.message;
        loading = false;
      }
    });

    return () => {
      authUnsubscribe();
    };
  });

  // Handle requirement updates
  async function handleSave(event) {
    try {
      const updatedRequirement = event.detail;
      await updateRequirement(requirementId, updatedRequirement);
      requirement = updatedRequirement;
      editing = false;
    } catch (err) {
      console.error('Error updating requirement:', err);
      error = err.message;
    }
  }

  // Handle requirement deletion
  async function handleDelete() {
    try {
      await deleteRequirement(requirementId);
      // Navigate back to project page
      goto(`/projects/${projectId}`);
    } catch (err) {
      console.error('Error deleting requirement:', err);
      error = err.message;
    }
  }

  // Navigate back to the project page
  function goBackToProject() {
    goto(`/projects/${projectId}`);
  }
</script>

<div class="min-h-screen bg-gray-50 flex flex-col">
  {#if loading}
    <div class="flex-1 flex items-center justify-center">
      <div class="animate-pulse flex space-x-4 items-center">
        <div class="h-3 w-3 bg-blue-600 rounded-full"></div>
        <div class="h-3 w-3 bg-blue-600 rounded-full"></div>
        <div class="h-3 w-3 bg-blue-600 rounded-full"></div>
        <span class="text-gray-600 font-medium">Loading requirement details...</span>
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
  {:else if requirement && project}
    <div class="flex-1 flex flex-col">
      <!-- Header with navigation -->
      <div class="bg-white border-b border-gray-200 w-full py-4 px-4 shadow-sm">
        <div class="max-w-7xl mx-auto flex justify-between items-center">
          <div class="flex items-center">
            <button
              on:click={goBackToProject}
              class="inline-flex items-center mr-4 text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              Back to Project
            </button>
            <div class="flex items-center">
              <span class="text-gray-500 mr-2">{project.name}</span>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
              <span class="text-gray-800 ml-2 font-medium">Requirement Details</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Main content -->
      <div class="flex-1 p-8 max-w-5xl mx-auto w-full">
        <div class="bg-white rounded-lg shadow overflow-hidden">
          <RequirementDetail 
            requirement={requirement}
            project={project}
            userId={user?.uid}
            editing={editing}
            on:save={handleSave}
            on:delete={handleDelete}
            on:edit={() => editing = true}
            on:cancelEdit={() => editing = false}
          />
        </div>
      </div>
    </div>
  {/if}
</div>