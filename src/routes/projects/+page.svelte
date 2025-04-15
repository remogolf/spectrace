<script>
  import { onMount } from 'svelte';
  import { getUserProjects, deleteProject, updateProject } from '$lib/projectsService';
  import { auth } from '$lib/firebase';
  import { onAuthStateChanged } from 'firebase/auth';
  import { goto } from '$app/navigation';

  let projects = [];
  let loading = true;
  let error = null;
  let searchTerm = '';
  let sortOption = 'newest';
  
  // Delete modal state
  let showDeleteModal = false;
  let projectToDelete = null;
  let deletingProject = false;
  let deleteError = null;
  
  // Edit modal state
  let showEditModal = false;
  let projectToEdit = null;
  let editForm = { name: '', description: '', tags: '' };
  let editingProject = false;
  let editError = null;

  // Filter projects based on search term
  $: filteredProjects = searchTerm 
    ? projects.filter(project => 
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : projects;

  // Sort projects based on selected option
  $: sortedProjects = [...filteredProjects].sort((a, b) => {
    if (sortOption === 'newest') {
      return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    } else if (sortOption === 'oldest') {
      return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
    } else if (sortOption === 'nameAsc') {
      return a.name.localeCompare(b.name);
    } else if (sortOption === 'nameDesc') {
      return b.name.localeCompare(a.name);
    }
    return 0;
  });

  onMount(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        goto('/login');
        return;
      }
      
      try {
        loading = true;
        projects = await getUserProjects();
        console.log('Loaded projects:', projects);
      } catch (err) {
        console.error('Error fetching projects:', err);
        error = err.message;
      } finally {
        loading = false;
      }
    });

    return unsubscribe;
  });

  function navigateToProject(projectId) {
    console.log('Navigating to project:', projectId);
    goto(`/projects/${projectId}`);
  }
  
  function confirmDelete(project) {
    projectToDelete = project;
    showDeleteModal = true;
    deleteError = null;
  }
  
  function cancelDelete() {
    showDeleteModal = false;
    projectToDelete = null;
    deleteError = null;
  }
  
  async function handleDeleteProject() {
    if (!projectToDelete) return;
    
    try {
      deletingProject = true;
      deleteError = null;
      
      await deleteProject(projectToDelete.id);
      
      // Remove the deleted project from the list
      projects = projects.filter(p => p.id !== projectToDelete.id);
      
      // Close the modal
      showDeleteModal = false;
      projectToDelete = null;
      
    } catch (err) {
      console.error('Error deleting project:', err);
      deleteError = err.message;
    } finally {
      deletingProject = false;
    }
  }

  // Edit project functions
  function openEditModal(project) {
    projectToEdit = project;
    // Initialize the form with current project data
    editForm = {
      name: project.name || '',
      description: project.description || '',
      tags: project.tags ? project.tags.join(', ') : ''
    };
    showEditModal = true;
    editError = null;
  }
  
  function cancelEdit() {
    showEditModal = false;
    projectToEdit = null;
    editError = null;
  }
  
  async function handleEditProject() {
    if (!projectToEdit) return;
    
    try {
      editingProject = true;
      editError = null;
      
      // Process tags from comma-separated string to array
      const tags = editForm.tags
        ? editForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        : [];
      
      // Prepare update data
      const updateData = {
        name: editForm.name,
        description: editForm.description,
        tags
      };
      
      await updateProject(projectToEdit.id, updateData);
      
      // Update the project in the local list
      projects = projects.map(p => 
        p.id === projectToEdit.id 
          ? { ...p, ...updateData } 
          : p
      );
      
      // Close the modal
      showEditModal = false;
      projectToEdit = null;
      
    } catch (err) {
      console.error('Error updating project:', err);
      editError = err.message;
    } finally {
      editingProject = false;
    }
  }
</script>

<div class="min-h-screen bg-gray-50 flex flex-col">
  <!-- Main Content -->
  <main class="py-8 flex-1">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="mb-8">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">My Projects</h1>
            <p class="mt-1 text-sm text-gray-500">Manage and organize your requirements specifications</p>
          </div>
          <a 
            href="/projects/new" 
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
            </svg>
            New Project
          </a>
        </div>

        <!-- Search and filter controls -->
        <div class="mt-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div class="flex flex-col md:flex-row gap-4">
            <div class="flex-1">
              <label for="search" class="sr-only">Search Projects</label>
              <div class="relative rounded-md shadow-sm">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  bind:value={searchTerm}
                  type="text" 
                  name="search" 
                  id="search"
                  class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Search projects..."
                />
              </div>
            </div>
            <div class="w-full md:w-48">
              <label for="sort" class="sr-only">Sort By</label>
              <select
                bind:value={sortOption}
                id="sort"
                name="sort"
                class="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="nameAsc">Name (A-Z)</option>
                <option value="nameDesc">Name (Z-A)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {#if loading}
        <div class="flex justify-center py-16">
          <div class="animate-pulse flex flex-col items-center">
            <div class="flex space-x-2 mb-3">
              <div class="h-3 w-3 bg-blue-600 rounded-full"></div>
              <div class="h-3 w-3 bg-blue-600 rounded-full animation-delay-200"></div>
              <div class="h-3 w-3 bg-blue-600 rounded-full animation-delay-400"></div>
            </div>
            <span class="text-gray-600 font-medium">Loading your projects...</span>
          </div>
        </div>
      {:else if error}
        <div class="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded">
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
      {:else if projects.length === 0}
        <div class="bg-white rounded-lg shadow-md p-12 text-center border border-gray-200">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
          <p class="text-gray-600 mb-6">Create your first project to start tracking requirements</p>
          <a 
            href="/projects/new" 
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
            </svg>
            Create your first project
          </a>
        </div>
      {:else}
        {#if searchTerm && filteredProjects.length === 0}
          <div class="bg-white rounded-lg shadow-sm p-8 text-center border border-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 class="text-lg font-medium text-gray-900 mb-1">No matching projects</h3>
            <p class="text-gray-600">No projects match your search "{searchTerm}"</p>
          </div>
        {:else}
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each sortedProjects as project}
              <div 
                class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200 flex flex-col h-full"
              >
                <div class="p-5 flex-grow">
                  <div class="flex items-start justify-between">
                    <h3 class="text-lg font-semibold text-gray-900 mb-1 truncate">{project.name}</h3>
                    <div class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      {project.requirements?.length || 0} requirements
                    </div>
                  </div>
                  <p class="text-gray-600 text-sm mb-4 line-clamp-2">{project.description || 'No description provided'}</p>
                  
                  <div class="flex flex-wrap gap-2 mt-2 mb-4">
                    {#if project.tags && project.tags.length > 0}
                      {#each project.tags as tag}
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {tag}
                        </span>
                      {/each}
                    {/if}
                  </div>
                </div>
                
                <div class="bg-gray-50 px-5 py-3 border-t border-gray-200 flex justify-between items-center">
                  <div class="text-xs text-gray-500">
                    {#if project.createdAt}
                      Created: {new Date(project.createdAt.seconds * 1000).toLocaleDateString()}
                    {/if}
                  </div>
                  <div class="flex items-center space-x-2">
                    <button 
                      on:click={() => openEditModal(project)}
                      class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-150"
                      title="Edit Project"
                      aria-label="Edit Project"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                    <button 
                      on:click={() => confirmDelete(project)}
                      class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-150"
                      title="Delete Project"
                      aria-label="Delete Project"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                      </svg>
                    </button>
                    <button 
                      on:click={() => navigateToProject(project.id)}
                      class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
                    >
                      View Project
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      {/if}
    </div>
  </main>
  
  <!-- Delete Confirmation Modal -->
  {#if showDeleteModal}
    <div class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <!-- Background overlay -->
        <div class="fixed inset-0 transition-opacity" aria-hidden="true">
          <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <!-- Modal panel -->
        <div
          class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-headline"
        >
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                <svg class="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-headline">
                  Delete Project
                </h3>
                <div class="mt-2">
                  <p class="text-sm text-gray-500">
                    Are you sure you want to delete the project "{projectToDelete?.name}"? This action cannot be undone.
                    All requirements and data associated with this project will be permanently removed.
                  </p>
                  
                  {#if deleteError}
                    <div class="mt-3 p-3 bg-red-50 border-l-4 border-red-400 text-sm text-red-700">
                      {deleteError}
                    </div>
                  {/if}
                </div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              on:click={handleDeleteProject}
              disabled={deletingProject}
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
            >
              {deletingProject ? 'Deleting...' : 'Delete'}
            </button>
            <button
              type="button"
              on:click={cancelDelete}
              disabled={deletingProject}
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
  
  <!-- Edit Project Modal -->
  {#if showEditModal}
    <div class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <!-- Background overlay -->
        <div class="fixed inset-0 transition-opacity" aria-hidden="true">
          <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <!-- Modal panel -->
        <div
          class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-modal-headline"
        >
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6">
            <div class="sm:flex sm:items-start">
              <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </div>
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 class="text-lg leading-6 font-medium text-gray-900" id="edit-modal-headline">
                  Edit Project
                </h3>
                <div class="mt-4 space-y-4">
                  <div>
                    <label for="project-name" class="block text-sm font-medium text-gray-700">Project Name</label>
                    <input 
                      type="text" 
                      id="project-name" 
                      bind:value={editForm.name}
                      class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter project name"
                      required
                    />
                  </div>
                  
                  <div>
                    <label for="project-description" class="block text-sm font-medium text-gray-700">Description</label>
                    <textarea 
                      id="project-description" 
                      bind:value={editForm.description}
                      rows="3" 
                      class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter project description"
                    ></textarea>
                  </div>
                  
                  <div>
                    <label for="project-tags" class="block text-sm font-medium text-gray-700">Tags</label>
                    <input 
                      type="text" 
                      id="project-tags" 
                      bind:value={editForm.tags}
                      class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter tags separated by commas"
                    />
                    <p class="mt-1 text-sm text-gray-500">Separate tags with commas (e.g. web, design, api)</p>
                  </div>
                  
                  {#if editError}
                    <div class="p-3 bg-red-50 border-l-4 border-red-400 text-sm text-red-700">
                      {editError}
                    </div>
                  {/if}
                </div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              on:click={handleEditProject}
              disabled={editingProject || !editForm.name.trim()}
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
            >
              {editingProject ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              on:click={cancelEdit}
              disabled={editingProject}
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Animation delays for loading indicators */
  .animation-delay-200 {
    animation-delay: 0.2s;
  }
  .animation-delay-400 {
    animation-delay: 0.4s;
  }
</style>