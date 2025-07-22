const routes = {
    MainMenu: '/',
    Game: '/game',
    Settings: '/settings',
    About: '/about',
    Codex: '/codex',
  };
  
  /**
   * Returns the path string from the route name.
   * @param {string} name - Route key (e.g., 'MainMenu')
   * @returns {string} - Route path (e.g., '/')
   */
  export function createPageUrl(name) {
    console.log("Routing to ". name + " ...");
    return routes[name] || '/';
  }
  