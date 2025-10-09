// public/js/bar.js
    async function updateTopBar() {
      try {
        const res = await fetch('/api/current_user');
        const user = await res.json();

        const topBar = document.getElementById('topBarUser');
        if (user) {
          topBar.innerHTML = `Welcome, <strong>${user.name}</strong> | <a href="/logout">Log out</a>`;
        } else {
          topBar.innerHTML = `Welcome visitor, you can 
            <a href="/login">Log in</a> or 
            <a href="/register">Create an Account</a>`;
        }
      } catch (err) {
        console.error('Error fetching user:', err);
      }
    }

    // Call it on page load
    updateTopBar();
