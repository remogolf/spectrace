<script>
  import { getContext } from 'svelte';
  import { goto } from '$app/navigation';
  
  // Get the user store from the context provided by the layout
  const user = getContext('user');
</script>

<div class="flex-1 py-16 md:py-24">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <!-- Hero Section -->
    <div class="bg-white rounded-2xl shadow-xl overflow-hidden">
      <div class="px-6 md:px-8 lg:px-12 py-12 lg:py-16">
        <div class="grid grid-cols-1 lg:grid-cols-5 gap-12 items-center">
          <div class="lg:col-span-3 space-y-8">
            <div>
              <h1 class="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900">
                <span class="block">Requirement tracking,</span>
                <span class="block text-blue-600">made simple</span>
              </h1>
              <p class="mt-6 text-xl text-gray-500 max-w-3xl">
                SpecTrace helps teams manage specifications, track requirements, and ensure complete traceability across projects of any size or complexity.
              </p>
            </div>
            <div class="flex flex-col sm:flex-row gap-4">
              {#if $user}
                <a 
                  href="/projects" 
                  class="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-colors duration-150"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                  </svg>
                  My Projects
                </a>
                <a
                  href="/projects/new"
                  class="inline-flex items-center justify-center px-5 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-colors duration-150"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
                  </svg>
                  Create New Project
                </a>
              {:else}
                <a 
                  href="/register" 
                  class="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-colors duration-150"
                >
                  Get Started for Free
                </a>
                <a
                  href="/login"
                  class="inline-flex items-center justify-center px-5 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-colors duration-150"
                >
                  Sign In
                </a>
              {/if}
            </div>
          </div>
          <div class="lg:col-span-2">
            <div class="relative rounded-xl overflow-hidden shadow-lg transform perspective-1000">
              <!-- Hero illustration or screenshot -->
              <div class="bg-gradient-to-br from-blue-100 to-indigo-50 p-6 text-center aspect-[4/3] rounded-xl flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-32 w-32 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Features Section -->
    <div class="py-16">
      <div class="text-center mb-12">
        <h2 class="text-3xl font-extrabold text-gray-900 sm:text-4xl mb-4">
          Everything you need for requirement management
        </h2>
        <p class="max-w-2xl mx-auto text-lg text-gray-500">
          Designed to help teams of all sizes track and manage complex specifications with ease.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <!-- Feature 1 -->
        <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex flex-col">
          <div class="rounded-full bg-blue-50 w-12 h-12 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-2">Organize Projects</h3>
          <p class="text-gray-600 flex-grow">
            Create and manage multiple projects with their own unique requirements and specifications.
          </p>
        </div>

        <!-- Feature 2 -->
        <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex flex-col">
          <div class="rounded-full bg-blue-50 w-12 h-12 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-2">Hierarchical Requirements</h3>
          <p class="text-gray-600 flex-grow">
            Build detailed requirement trees with parent-child relationships for clear organization and traceability.
          </p>
        </div>

        <!-- Feature 3 -->
        <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex flex-col">
          <div class="rounded-full bg-blue-50 w-12 h-12 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-2">Real-time Collaboration</h3>
          <p class="text-gray-600 flex-grow">
            Collaborate with team members in real-time with synchronized updates across the entire project.
          </p>
        </div>

        <!-- Feature 4 -->
        <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex flex-col">
          <div class="rounded-full bg-blue-50 w-12 h-12 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-2">Advanced Filtering</h3>
          <p class="text-gray-600 flex-grow">
            Find exactly what you need with powerful filtering by status, section, tags, and more.
          </p>
        </div>

        <!-- Feature 5 -->
        <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex flex-col">
          <div class="rounded-full bg-blue-50 w-12 h-12 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-2">Status Tracking</h3>
          <p class="text-gray-600 flex-grow">
            Track the progress of requirements from draft to approval with customizable status workflows.
          </p>
        </div>

        <!-- Feature 6 -->
        <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex flex-col">
          <div class="rounded-full bg-blue-50 w-12 h-12 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-2">Team Assignment</h3>
          <p class="text-gray-600 flex-grow">
            Assign requirements to team members and track ownership throughout the project lifecycle.
          </p>
        </div>
      </div>
    </div>

    <!-- CTA Section -->
    <div class="py-12">
      <div class="bg-blue-700 rounded-2xl shadow-xl overflow-hidden">
        <div class="px-6 py-12 sm:px-12 lg:px-16 lg:py-16">
          <div class="md:flex md:items-center md:justify-between">
            <div class="md:flex-shrink-0 mb-6 md:mb-0">
              <h2 class="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Ready to streamline your requirements management?
              </h2>
              <p class="mt-3 text-lg text-blue-100 max-w-3xl">
                Start organizing your project specifications today with our powerful yet simple platform.
              </p>
            </div>
            <div class="mt-8 md:mt-0 flex lg:flex-shrink-0">
              {#if $user}
                <div class="inline-flex rounded-md shadow">
                  <a 
                    href="/projects" 
                    class="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 transition-colors duration-150"
                  >
                    Go to My Projects
                  </a>
                </div>
              {:else}
                <div class="inline-flex rounded-md shadow">
                  <a 
                    href="/register" 
                    class="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 transition-colors duration-150"
                  >
                    Sign Up Free
                  </a>
                </div>
              {/if}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
