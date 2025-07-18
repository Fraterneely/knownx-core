const routes = {
    MainMenu: '/',
    Game: '/game',
    Settings: '/settings',
    About: '/about',
  };
  
  /**
   * Returns the path string from the route name.
   * @param {string} name - Route key (e.g., 'MainMenu')
   * @returns {string} - Route path (e.g., '/')
   */
  export function createPageUrl(name) {
    return routes[name] || '/';
  }
  