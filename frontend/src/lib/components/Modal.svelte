<script lang="ts">
  let { showModal = $bindable() } = $props();
  let channelUrl = $state<string>('');
  let error = $state<string>('');
  let modalContent: HTMLDivElement;

  let dialogElement: HTMLDialogElement | undefined = $state();

  function authorizeYouTube(): void {
    window.location.href = '/authorize';
  }

  interface AddChannelResponse {
    error?: string;
  }

  async function addChannel(): Promise<void> {
    if (!channelUrl.trim()) {
      error = 'Please enter a valid URL.';
      return;
    }

    try {
      const res = await fetch('/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: channelUrl })
      });

      const data: AddChannelResponse = await res.json();
      if (res.ok) {
        alert('Channel sent for processing!');
        channelUrl = '';
        showModal = false;
        error = '';
      } else {
        error = data.error || 'Failed to add the channel.';
      }
    } catch (err) {
      console.error('Error adding channel:', err);
      error = 'Network error. Please try again.';
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      closeModal();
    }
  }

  function handleOverlayClick(event: MouseEvent): void {
    // Only close if clicking the overlay itself, not its children
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }

  function closeModal(): void {
    error = '';
    channelUrl = '';
    showModal = false;
  }

  $effect(() => {
    if (showModal) {
      dialogElement?.showModal();
    } else {
      dialogElement?.close();
    }
  });
</script>

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: flex-start; /* Changed from center to allow scrolling */
    z-index: 1000;
    padding: 2rem 1rem;
    overflow-y: auto;
  }

  .modal-content {
    background: white;
    padding: 2rem;
    border-radius: 10px;
    max-width: 500px;
    width: 90%;
    position: relative;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    margin: auto;
  }

  h2 {
    margin: 0 0 1rem;
    color: #1a202c;
    font-size: 1.5rem;
  }

  .description {
    margin-bottom: 1.5rem;
    color: #4a5568;
    line-height: 1.6;
  }

  .features {
    margin: 1rem 0 1.5rem;
    padding-left: 1.5rem;
  }

  .features li {
    margin-bottom: 0.75rem;
    color: #4a5568;
    line-height: 1.4;
  }

  .button-group {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
  }

  .secondary-button {
    flex: 1;
    padding: 0.75rem 1.5rem;
    background-color: transparent;
    color: #4a5568;
    border: 1px solid #cbd5e0;
    border-radius: 5px;
    font-size: 1rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .secondary-button:hover {
    background-color: #f7fafc;
  }

  .close-button {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: none;
    border: none;
    font-size: 1.5rem;
    color: #718096;
    cursor: pointer;
    padding: 0.5rem;
    line-height: 1;
  }

  .input-field {
    margin-top: 20px;
    width: 90%;
    padding: 12px;
    border: 2px solid #cbd5e0;
    border-radius: 6px;
    font-size: 1rem;
  }

  .input-field:focus {
    outline: none;
    border-color: #2c5282;
    box-shadow: 0 0 0 3px rgba(44, 82, 130, 0.2);
  }

  .error-message {
    color: #c53030;
    margin-top: 10px;
    font-size: 0.9rem;
    font-weight: 500;
  }

  .section-divider {
    margin: 2rem 0;
    border-top: 1px solid #e2e8f0;
    position: relative;
  }

  .section-divider span {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    background: white;
    padding: 0 1rem;
    color: #718096;
    font-size: 0.875rem;
  }

  .platform-button {
    width: 100%;
    padding: 0.75rem 1rem;
    margin-bottom: 0.75rem;
    border-radius: 5px;
    font-size: 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    transition: all 0.2s;
  }

  .platform-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .youtube-button {
    background-color: #ff0000;
    color: white;
    border: none;
  }

  .youtube-button:hover:not(:disabled) {
    background-color: #cc0000;
  }

  .twitter-button {
    background-color: #1da1f2;
    color: white;
    border: none;
  }

  .twitter-button:hover:not(:disabled) {
    background-color: #1a91da;
  }

  .manual-section {
    margin-top: 1rem;
  }

  .manual-section p {
    font-size: 0.875rem;
    color: #718096;
    margin-bottom: 1rem;
  }

  @media (max-width: 640px) {
    .modal-overlay {
      padding: 1rem;
      align-items: flex-start;
    }

    .modal-content {
      padding: 1.5rem;
      margin: 0 auto;
      max-height: calc(100vh - 2rem);
      overflow-y: auto;
    }

    .button-group {
      flex-direction: column;
    }

    .secondary-button {
      width: 100%;
    }
  }
</style>

<svelte:window onkeydown={handleKeydown}/>

<!-- Use role="dialog" and aria-modal="true" for better screen reader support -->
<div 
  class="modal-overlay" 
  role="presentation"
  onclick={handleOverlayClick}
  onkeydown={handleKeydown}
>
  <div 
    class="modal-content" 
    role="dialog" 
    aria-labelledby="modal-title"
    aria-modal="true"
    bind:this={modalContent}
  >
    <button 
      type="button"
      class="close-button" 
      onclick={closeModal}
      onkeydown={handleKeydown}
      aria-label="Close modal"
    >
      ×
    </button>
    
    <h2 id="modal-title">Unlock Full Creator Search</h2>
    
    <p class="description">
      Import your subscriptions from your favorite platforms and discover where else your favorite creators are creating content.
    </p>

    <ul class="features">
      <li>Import all your subscriptions with one click</li>
      <li>Find creators' other platforms and websites (Patreon, Twitter, and more)</li>
      <li>Get unlimited search results within your subscriptions</li>
    </ul>

    <div class="button-group">
      <button 
        type="button"
        class="platform-button youtube-button"
        onclick={authorizeYouTube}
        onkeydown={handleKeydown}
        aria-label="Import YouTube subscriptions"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
        </svg>
        Import YouTube Subscriptions
      </button>
      <button 
        type="button"
        class="platform-button twitter-button"
        disabled
        aria-label="Import Twitter subscriptions (Coming soon)"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
        </svg>
        Import Twitter Follows (Coming Soon)
      </button>
    </div>

    <div class="section-divider" role="separator">
      <span>or</span>
    </div>

    <div class="manual-section">
      <p>
        Don't want to import? You can manually add creators one at a time:
      </p>
      <input
        type="text"
        class="input-field"
        bind:value={channelUrl}
        placeholder="Enter YouTube channel URL or handle"
        aria-label="YouTube channel URL or handle"
        aria-invalid={!!error}
        aria-describedby={error ? 'error-message' : undefined}
      />
      <button 
        type="button"
        class="secondary-button"
        onclick={addChannel}
        onkeydown={handleKeydown}
        aria-label="Add channel manually"
        style="margin-top: 0.5rem;"
      >
        Add Channel
      </button>
    </div>

    {#if error}
      <p id="error-message" class="error-message" role="alert">{error}</p>
    {/if}
  </div>
</div>
