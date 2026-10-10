<script lang="ts">
  import { tick } from 'svelte';
  import { searchStore, type SearchResponse } from '../stores/search';
  
  let searchTimeout: ReturnType<typeof setTimeout>;

  export let onSearch: (query: string) => Promise<void>;

  async function handleSearch(event: Event) {
    const query = (event.target as HTMLInputElement).value;
    searchStore.setQuery(query);
    clearTimeout(searchTimeout);
    searchStore.setLoading(true);
    await tick();
    searchTimeout = setTimeout(() => onSearch(query), 300);
  }
</script>

<style>
  .search-section {
    position: sticky;
    top: 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(8px);
    z-index: 100;
    transition: box-shadow 0.2s ease;
  }

  .search-section.sticky {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .search-bar {
    width: 100%;
    max-width: 600px;
    padding: 12px;
    border: 2px solid #cbd5e0;
    border-radius: 25px;
    font-size: 1rem;
    outline: none;
    background: white;
    z-index: 50;
    margin: 1rem 0;
    box-sizing: border-box;
  }
  
  .search-bar:focus {
    border-color: #2c5282;
    box-shadow: 0 0 0 3px rgba(44, 82, 130, 0.2);
  }

  @media (max-width: 640px) {
    .search-section {
      margin-bottom: 1rem;
      padding: 0.5rem 0;
    }

    .search-bar {
      margin: 0.5rem 20px;
      width: calc(100% - 40px);
      font-size: 0.9rem;
    }
  }
</style>

<script lang="ts" context="module">
  let isSticky = false;

  if (typeof window !== 'undefined') {
    window.addEventListener('scroll', () => {
      const scrollPosition = window.scrollY;
      isSticky = scrollPosition > 0;
      const searchSection = document.querySelector('.search-section');
      if (searchSection) {
        searchSection.classList.toggle('sticky', isSticky);
      }
    });
  }
</script>

<div class="search-section" class:sticky={isSticky}>
  <input
    class="search-bar"
    type="text"
    bind:value={$searchStore.query}
    placeholder="Search for creators, channels, or platforms..."
    oninput={handleSearch}
    aria-label="Search creators"
  />
</div>
