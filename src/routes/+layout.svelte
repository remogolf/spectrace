<script>
  import '../app.css';
  import { auth } from '$lib/firebase';
  import { onAuthStateChanged } from 'firebase/auth';
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { navigating } from '$app/stores';
  import { setContext } from 'svelte';

  export const user = writable(null);
  export const loading = writable(true);

  // Set the stores in context for child components to access
  setContext('user', user);
  setContext('loading', loading);
  
  // Mobile menu state
  let mobileMenuOpen = false;
  
  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }
  
  // Close mobile menu when route changes
  $: if (navigating) {
    mobileMenuOpen = false;
  }

  onMount(() => {
    const unsubscribe = onAuthStateChanged(auth, (userData) => {
      user.set(userData);
      loading.set(false);
    });

    return unsubscribe;
  });

  async function handleSignOut() {
    try {
      await auth.signOut();
      user.set(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  // Navigation tracking for highlighting active links
  $: path = typeof window !== 'undefined' ? window.location.pathname : '';
</script>

<div class="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-blue-50">
  <!-- Loading screen for transitions -->
  {#if $navigating}
    <div class="fixed inset-0 bg-white bg-opacity-80 z-50 flex items-center justify-center transition-opacity duration-300">
      <div class="flex flex-col items-center justify-center">
        <div class="animate-pulse flex space-x-2">
          <div class="h-3 w-3 bg-blue-600 rounded-full"></div>
          <div class="h-3 w-3 bg-blue-600 rounded-full animation-delay-200"></div>
          <div class="h-3 w-3 bg-blue-600 rounded-full animation-delay-400"></div>
        </div>
        <span class="text-blue-800 font-medium mt-3">Loading...</span>
      </div>
    </div>
  {/if}

  <!-- Unified Header with responsive design -->
  <header class="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <!-- Logo and Brand -->
        <div class="flex items-center">
          <a href="/" class="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd" />
            </svg>
            <h1 class="text-2xl font-bold text-blue-700 ml-1">SpecTrace</h1>
          </a>
        </div>
        
        <!-- Desktop Navigation -->
        <nav class="hidden md:flex items-center space-x-4">
          {#if $loading}
            <div class="animate-pulse h-8 w-20 bg-gray-200 rounded"></div>
          {:else if $user}
            <!-- Main Navigation Links -->
            <a 
              href="/" 
              class="{path === '/' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'} px-3 py-2 rounded-md text-sm font-medium"
            >
              Dashboard
            </a>
            <a 
              href="/projects" 
              class="{path.startsWith('/projects') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'} px-3 py-2 rounded-md text-sm font-medium"
            >
              Projects
            </a>
            
            <!-- User Profile -->
            <div class="flex items-center ml-4 border-l border-gray-300 pl-4">
              <div class="flex items-center">
                <span class="inline-block h-8 w-8 rounded-full bg-blue-100 text-blue-700 overflow-hidden flex items-center justify-center">
                  {$user.email ? $user.email[0].toUpperCase() : 'U'}
                </span>
                <span class="ml-2 text-sm text-gray-700 hidden lg:inline-block">{$user.email}</span>
              </div>
              <button 
                on:click={handleSignOut}
                class="ml-4 inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          {:else}
            <div class="flex items-center space-x-2">
              <a 
                href="/login" 
                class="{path === '/login' ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:text-blue-600'} px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150"
              >
                Log in
              </a>
              <a 
                href="/register" 
                class="inline-flex items-center px-3 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
              >
                Sign up
              </a>
            </div>
          {/if}
        </nav>
        
        <!-- Mobile Menu Button -->
        <div class="md:hidden">
          <button 
            type="button" 
            on:click={toggleMobileMenu}
            class="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-blue-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500" 
            aria-controls="mobile-menu" 
            aria-expanded="false"
          >
            <span class="sr-only">{mobileMenuOpen ? 'Close menu' : 'Open menu'}</span>
            {#if mobileMenuOpen}
              <!-- Icon when menu is open (X) -->
              <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            {:else}
              <!-- Icon when menu is closed (hamburger) -->
              <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            {/if}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Mobile Navigation Menu -->
    {#if mobileMenuOpen}
      <div id="mobile-menu" class="md:hidden">
        <div class="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200">
          {#if !$loading && $user}
            <a 
              href="/" 
              class="{path === '/' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'} block px-3 py-2 rounded-md text-base font-medium"
            >
              Dashboard
            </a>
            <a 
              href="/projects" 
              class="{path.startsWith('/projects') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'} block px-3 py-2 rounded-md text-base font-medium"
            >
              Projects
            </a>
            <div class="pt-4 pb-3 border-t border-gray-200">
              <div class="flex items-center px-3">
                <div class="flex-shrink-0">
                  <span class="inline-block h-10 w-10 rounded-full bg-blue-100 text-blue-700 overflow-hidden flex items-center justify-center text-lg">
                    {$user.email ? $user.email[0].toUpperCase() : 'U'}
                  </span>
                </div>
                <div class="ml-3">
                  <div class="text-base font-medium text-gray-800">{$user.email}</div>
                </div>
              </div>
              <div class="mt-3 space-y-1">
                <button 
                  on:click={handleSignOut}
                  class="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50"
                >
                  Sign Out
                </button>
              </div>
            </div>
          {:else if !$loading}
            <a 
              href="/login" 
              class="{path === '/login' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'} block px-3 py-2 rounded-md text-base font-medium"
            >
              Log in
            </a>
            <a 
              href="/register" 
              class="{path === '/register' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'} block px-3 py-2 rounded-md text-base font-medium"
            >
              Sign up
            </a>
          {/if}
        </div>
      </div>
    {/if}
  </header>

  <!-- Main Content -->
  <main class="flex-1">
    <slot />
  </main>

  <!-- Footer with improved design -->
  <footer class="bg-white border-t border-gray-200 py-6 mt-auto">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex flex-col items-center justify-between gap-4 md:flex-row">
        <div class="flex items-center">
          <span class="text-gray-500">© {new Date().getFullYear()} SpecTrace. All rights reserved.</span>
        </div>
        <div class="flex gap-x-6">
          <a href="#" class="text-gray-400 hover:text-gray-600 text-sm">
            Privacy Policy
          </a>
          <a href="#" class="text-gray-400 hover:text-gray-600 text-sm">
            Terms of Service
          </a>
          <a href="#" class="text-gray-400 hover:text-gray-600 text-sm">
            Contact Us
          </a>
        </div>
      </div>
    </div>
  </footer>
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
