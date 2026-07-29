const AppLoader = {
  spinner(size) {
    const s = size === 'lg' ? '20px' : '14px';
    return `<span class="app-spinner" style="width:${s};height:${s};font-size:${s}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="width:100%;height:100%"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg></span>`;
  },

  button(text) {
    return `<span class="app-loader--inline">${this.spinner()} <span>${text}</span></span>`;
  },

  block(text) {
    return `<div class="app-loader">${this.spinner('lg')}<span class="app-loader__text">${text}</span></div>`;
  },
};
