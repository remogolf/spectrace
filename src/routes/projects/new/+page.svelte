<script>
  import { onMount } from 'svelte';
  import { createProject } from '$lib/projectsService';
  import { auth } from '$lib/firebase';
  import { onAuthStateChanged } from 'firebase/auth';
  import { goto } from '$app/navigation';

  let name = '';
  let description = '';
  let loading = false;
  let error = null;
  let user = null;

  onMount(() => {
    const unsubscribe = onAuthStateChanged(auth, (userData) => {
      if (!userData) {
        goto('/login');
        return;
      }
      user = userData;
    });

    return unsubscribe;
  });

  async function handleSubmit() {
    if (!name.trim()) {
      error = 'Project name is required';
      return;
    }

    if (!user) {
      error = 'You must be logged in to create a project';
      return;
    }

    try {
      loading = true;
      error = null;
      
      const projectId = await createProject({
        name,
        description,
        userId: user.uid
      });
      
      // Navigate to the new project
      goto(`/projects/${projectId}`);
    } catch (err) {
      console.error('Error creating project:', err);
      error = err.message;
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-screen bg-gray-100">
  <header class="bg-blue-600 text-white shadow-lg">
    <div class="container mx-auto px-4 py-6">
      <div class="flex justify-between items-center">
        <h1 class="text-3xl font-bold">SpecTrace</h1>
        <nav>
          <a href="/projects" class="text-white hover:text-gray-200 mr-4">Projects</a>
          <a href="/" class="text-white hover:text-gray-200">Home</a>
        </nav>
      </div>
    </div>
  </header>

  <main class="container mx-auto px-4 py-8">
    <div class="max-w-2xl mx-auto">
      <h2 class="text-2xl font-bold mb-6">Create New Project</h2>
      
      <div class="bg-white rounded-lg shadow-md p-6">
        <form on:submit|preventDefault={handleSubmit} class="space-y-6">
          {#if error}
            <div class="bg-red-50 border-l-4 border-red-400 p-4">
              <div class="flex">
                <div class="ml-3">
                  <p class="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          {/if}
          
          <div>
            <label for="name" class="block text-sm font-medium text-gray-700">Project Name</label>
            <input
              id="name"
              type="text"
              bind:value={name}
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label for="description" class="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              id="description"
              bind:value={description}
              rows="4"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            ></textarea>
          </div>
          
          <div class="flex justify-end">
            <a 
              href="/projects" 
              class="mr-4 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </a>
            <button
              type="submit"
              disabled={loading}
              class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  </main>
</div>