export const toastEvent = new EventTarget();

export const showToast = (message, type = 'error') => {
    toastEvent.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
};
