// Автосохранение комментариев в localStorage
const COMMENT_DRAFTS_KEY = 'comment_drafts';

export const saveCommentDraft = (applicationId, content) => {
  const drafts = JSON.parse(localStorage.getItem(COMMENT_DRAFTS_KEY) || '{}');
  drafts[applicationId] = {
    content,
    timestamp: Date.now(),
    applicationId
  };
  localStorage.setItem(COMMENT_DRAFTS_KEY, JSON.stringify(drafts));
};

export const getCommentDraft = (applicationId) => {
  const drafts = JSON.parse(localStorage.getItem(COMMENT_DRAFTS_KEY) || '{}');
  const draft = drafts[applicationId];
  // Удаляем старые drafts (старше 24 часов)
  if (draft && Date.now() - draft.timestamp > 24 * 60 * 60 * 1000) {
    delete drafts[applicationId];
    localStorage.setItem(COMMENT_DRAFTS_KEY, JSON.stringify(drafts));
    return null;
  }
  return draft?.content || '';
};

export const clearCommentDraft = (applicationId) => {
  const drafts = JSON.parse(localStorage.getItem(COMMENT_DRAFTS_KEY) || '{}');
  delete drafts[applicationId];
  localStorage.setItem(COMMENT_DRAFTS_KEY, JSON.stringify(drafts));
};