<script>
  import { onMount, onDestroy } from 'svelte';
  import { getComments, addComment, resolveComment, replyToComment, subscribeToComments } from '$lib/requirementsService';
  import { marked } from 'marked';
  export let requirementId;
  export let user;
  let comments = [];
  let loading = true;
  let newComment = '';
  let error = null;
  let unsubscribe;

  // Helper: build a tree from flat comments array
  function buildCommentTree(comments) {
    const map = {};
    comments.forEach(c => map[c.id] = { ...c, replies: [] });
    const roots = [];
    comments.forEach(c => {
      if (c.parentCommentId) {
        map[c.parentCommentId]?.replies.push(map[c.id]);
      } else {
        roots.push(map[c.id]);
      }
    });
    return roots;
  }

  function renderMarkdown(text) {
    if (!text) return '';
    // Highlight @mentions
    const mentionReplaced = text.replace(/@([\w-]+)/g, '<span class="mention">@$1</span>');
    return marked.parse(mentionReplaced);
  }

  async function handleReply(parentId, replyText) {
    if (!replyText.trim()) return;
    try {
      await replyToComment(requirementId, parentId, {
        authorId: user.uid,
        text: replyText,
        createdAt: new Date(),
        resolved: false,
        parentCommentId: parentId
      });
      comments = await getComments(requirementId);
    } catch (e) {
      error = e.message;
    }
  }

  async function handleToggleResolve(comment) {
    try {
      await resolveComment(requirementId, comment.id, !comment.resolved);
      comments = await getComments(requirementId);
    } catch (e) {
      error = e.message;
    }
  }

  let replyInputs = {};

  // Fetch comments on mount
  onMount(() => {
    loading = true;
    unsubscribe = subscribeToComments(requirementId, (liveComments) => {
      comments = liveComments;
      loading = false;
    });
  });

  onDestroy(() => {
    if (unsubscribe) unsubscribe();
  });

  async function handleAddComment() {
    if (!newComment.trim()) return;
    try {
      await addComment(requirementId, {
        authorId: user.uid,
        text: newComment,
        createdAt: new Date(),
        resolved: false,
        parentCommentId: null
      });
      newComment = '';
      comments = await getComments(requirementId);
    } catch (e) {
      error = e.message;
    }
  }
</script>

<div class="comments-thread">
  <h3 class="text-lg font-semibold mb-2">Comments & Discussion</h3>
  {#if loading}
    <div class="text-gray-400 italic">Loading comments...</div>
  {:else if error}
    <div class="text-red-500">{error}</div>
  {:else}
    {#if comments.length === 0}
      <div class="text-gray-400 italic">No comments yet.</div>
    {:else}
      <ul class="space-y-4">
        {#each buildCommentTree(comments) as comment (comment.id)}
          {#key comment.id}
            <svelte:self this={CommentItem} {comment} depth={0} />
          {/key}
        {/each}
      </ul>
    {/if}
    <div class="mt-4 flex gap-2">
      <input
        type="text"
        bind:value={newComment}
        class="flex-1 border-gray-300 rounded-lg px-3 py-2"
        placeholder="Add a comment... (Markdown supported, @mention users)"
        on:keydown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddComment())}
      />
      <button
        on:click={handleAddComment}
        class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
      >Comment</button>
    </div>
  {/if}
</div>

<!-- Define the comment item template -->
{#snippet CommentItem(comment, depth)}
  <li class="bg-gray-50 border border-gray-100 rounded-lg p-3" style="margin-left: {depth * 1.5}rem">
    <div class="flex items-center gap-2 mb-1">
      <span class="text-xs text-gray-500">{comment.authorId} • {comment.createdAt?.toDate ? comment.createdAt.toDate().toLocaleString() : ''}</span>
      <button class="text-xs text-green-600 ml-2" on:click={() => handleToggleResolve(comment)}>
        {comment.resolved ? 'Unresolve' : 'Resolve'}
      </button>
      {#if comment.resolved}
        <span class="text-green-600 text-xs ml-1">Resolved</span>
      {/if}
    </div>
    <div class="prose text-sm" {@html renderMarkdown(comment.text)}></div>
    <div class="mt-2 flex gap-2">
      <input type="text" bind:value={replyInputs[comment.id]} class="flex-1 border-gray-300 rounded-lg px-2 py-1 text-xs" placeholder="Reply..." on:keydown={(e) => e.key === 'Enter' && (e.preventDefault(), handleReply(comment.id, replyInputs[comment.id]), replyInputs[comment.id]='')} />
      <button on:click={() => { handleReply(comment.id, replyInputs[comment.id]); replyInputs[comment.id]=''; }} class="bg-blue-50 text-blue-600 px-2 rounded border border-blue-200 hover:bg-blue-100 text-xs">Reply</button>
    </div>
    {#if comment.replies && comment.replies.length > 0}
      <ul class="space-y-2 mt-2">
        {#each comment.replies as reply}
          {@render CommentItem(reply, depth+1)}
        {/each}
      </ul>
    {/if}
  </li>
{/snippet}

<style>
.comments-thread { margin-top: 2rem; }
.mention { color: #2563eb; font-weight: 500; }
</style>
