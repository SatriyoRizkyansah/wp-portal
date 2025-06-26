class WordPressManager {
  constructor() {
    console.log("Loading WordPress Manager...");
    // Initialize sites
    this.sites = [];

    // Load sites from localStorage or JSON file
    this.sites = this.loadSites();

    console.log(`Loaded ${this.sites.length} sites`);
    this.init();
  }

  init() {
    this.renderSites();
    this.bindEvents();
  }

  bindEvents() {
    document.getElementById("addSiteForm").addEventListener("submit", (e) => {
      e.preventDefault();
      this.addSite();
    });

    // Add listeners for export/import buttons
    document.getElementById("exportBtn").addEventListener("click", () => {
      this.exportToJson();
    });

    document.getElementById("importBtn").addEventListener("click", () => {
      document.getElementById("jsonFileInput").click();
    });

    document.getElementById("resetBtn").addEventListener("click", () => {
      this.resetToDefaultJson();
    });

    document.getElementById("jsonFileInput").addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        this.importFromJson(e.target.files[0]);
      }
    });
  }

  loadSites() {
    // Try to load from localStorage first
    const saved = localStorage.getItem("wp_sites");
    if (saved) {
      console.log("Loaded sites from localStorage");
      return JSON.parse(saved);
    }

    // If no localStorage data, try to load from the JSON file
    try {
      // Use XMLHttpRequest for synchronous file loading
      const xhr = new XMLHttpRequest();
      // Make sure we're using the right path
      const path = window.location.href.includes("file:///") ? "data/sites.json" : "/data/sites.json";
      xhr.open("GET", path, false); // Synchronous request
      xhr.send(null);

      if (xhr.status === 200) {
        console.log("Successfully loaded sites from sites.json file");
        const data = JSON.parse(xhr.responseText);
        // Save to localStorage for future use
        localStorage.setItem("wp_sites", JSON.stringify(data));
        return data;
      } else {
        console.warn("Could not load sites.json file, status:", xhr.status);
      }
    } catch (error) {
      console.error("Error loading sites from JSON file:", error);
    }

    // Return empty array if all else fails
    console.warn("No sites found in localStorage or sites.json");
    return [];
  }

  saveSites() {
    localStorage.setItem("wp_sites", JSON.stringify(this.sites));
  }

  addSite() {
    const form = document.getElementById("addSiteForm");
    const formData = new FormData(form);

    const site = {
      id: Date.now(),
      name: document.getElementById("siteName").value,
      url: document.getElementById("siteUrl").value,
      username: document.getElementById("username").value,
      password: document.getElementById("password").value,
      createdAt: new Date().toISOString(),
    };

    // Validate URL
    if (!site.url.includes("wp-admin") && !site.url.includes("wp-login")) {
      if (!site.url.endsWith("/")) {
        site.url += "/";
      }
      site.url += "wp-admin/";
    }

    // Make sure we are using https if available
    if (site.url.startsWith("http:") && !site.url.includes("localhost")) {
      site.url = site.url.replace("http:", "https:");
    }

    this.sites.push(site);
    this.saveSites();
    this.renderSites();
    form.reset();

    // Show success notification
    this.showNotification("Portal berhasil ditambahkan!", "success");

    // Prompt to download updated sites.json
    this.downloadUpdatedSitesJson(false);
  }

  deleteSite(id) {
    if (confirm("Yakin ingin menghapus portal ini?")) {
      this.sites = this.sites.filter((site) => site.id !== id);
      this.saveSites();
      this.renderSites();
      this.showNotification("Portal berhasil dihapus!", "success");

      // Prompt to download updated sites.json
      this.downloadUpdatedSitesJson(false);
    }
  }

  autoLogin(id) {
    console.log("Auto login clicked for ID:", id);

    // Get site by id - convert id to number if it's a string
    const numId = typeof id === "string" ? parseInt(id, 10) : id;
    console.log("Converted ID to number:", numId);

    const site = this.sites.find((site) => site.id === numId);
    if (!site) {
      console.error("Site not found with ID:", numId);
      this.showNotification("Error: Site not found", "error");
      return;
    }

    // Extract the base URL (domain) from the site URL
    let baseUrl = site.url;
    const urlObj = new URL(baseUrl);
    const domain = urlObj.hostname;
    const protocol = urlObj.protocol;

    // Create the correct login URL - try to use the provided URL if it already contains wp-login.php
    const loginUrl = site.url.includes("wp-login.php") ? site.url : `${protocol}//${domain}/wp-login.php`;

    // Calculate the correct redirect URL
    const redirectUrl = `${protocol}//${domain}/wp-admin/`;

    // Create a form to submit credentials
    const form = document.createElement("form");
    form.method = "POST";
    form.action = loginUrl;
    form.target = "_blank";

    // Set cookies that might help with the login process
    document.cookie = "wordpress_test_cookie=WP Cookie check; path=/; secure; SameSite=Lax";

    // Add fields - these match the exact fields in a successful WordPress login
    const fields = {
      log: site.username,
      pwd: site.password,
      "wp-submit": "Log In",
      redirect_to: redirectUrl,
      testcookie: "1",
    };

    Object.keys(fields).forEach((key) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = fields[key];
      form.appendChild(input);
    });

    // Log info for debugging (will be visible in browser console)
    console.log("Auto login attempt:", {
      site: site.name,
      url: site.url,
      loginUrl: form.action,
      redirectTo: fields.redirect_to,
    });

    try {
      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
      this.showNotification(`Logging in to ${site.name}...`, "success");
    } catch (error) {
      console.error("Auto login error:", error);
      this.showNotification(`Gagal login: ${error.message}`, "error");
    }
  }

  renderSites() {
    const container = document.getElementById("sitesContainer");

    if (!this.sites || this.sites.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
            <h3>No WordPress sites available</h3>
            <p>Add a new site using the form above or import from a JSON file</p>
        </div>
      `;
      return;
    }

    const sitesHTML = this.sites
      .map(
        (site) => `
          <div class="site-card">
              <button class="delete-btn btn btn-danger" onclick="wpManager.deleteSite(${site.id})">
                  ❌
              </button>
              <div class="site-header">
                  <div class="site-icon">${site.name.charAt(0)}</div>
                  <div class="site-info">
                      <div class="site-title">${site.name}</div>
                      <div class="site-url">${site.url.split("/wp-")[0]}</div>
                  </div>
              </div>

              <div class="credential-info">
                  <div class="credential-row">
                      <span class="credential-label">Username:</span>
                      <span class="credential-value">${site.username}</span>
                  </div>
                  <div class="credential-row">
                      <span class="credential-label">Password:</span>
                      <span class="credential-value password-dots">${"•".repeat(8)}</span>
                      <span class="credential-value password-text">${site.password}</span>
                      <button class="toggle-password" onclick="this.parentNode.classList.toggle('show-password')">
                          <span class="eye-icon">👁️</span>
                      </button>
                  </div>
              </div>

              <div class="actions">
                  <button class="btn btn-success auto-login-btn" onclick="wpManager.autoLogin(${site.id})">
                      🚀 Auto Login
                  </button>
                  <a href="${site.url}" target="_blank" class="btn btn-primary">
                      🔗 Open Admin
                  </a>
                  <a href="${site.url.split("/wp-")[0]}" target="_blank" class="btn btn-secondary">
                      🌐 Visit Site
                  </a>
              </div>
          </div>
        `
      )
      .join("");

    container.innerHTML = `<div class="sites-grid">${sitesHTML}</div>`;
  }

  showNotification(message, type = "success") {
    // Remove existing notification
    const existing = document.querySelector(".notification");
    if (existing) {
      existing.remove();
    }

    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => {
      notification.classList.add("show");
    }, 100);

    // Hide notification
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }, 3000);
  }

  exportToJson() {
    // Prepare data for export
    const dataStr = JSON.stringify(this.sites, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

    // Create download link
    const exportFileName = `wordpress-sites-${new Date().toISOString().slice(0, 10)}.json`;
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileName);
    linkElement.style.display = "none";

    // Trigger download
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);

    this.showNotification("Data berhasil diekspor ke file JSON!", "success");
  }

  importFromJson(file) {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);

        // Validate the data structure
        if (!Array.isArray(importedData)) {
          throw new Error("Format JSON tidak valid. Data harus berbentuk array.");
        }

        // Validate each site has required fields
        const requiredFields = ["name", "url", "username", "password"];
        const allValid = importedData.every((site) => {
          return requiredFields.every((field) => site[field] !== undefined);
        });

        if (!allValid) {
          throw new Error("Beberapa data portal tidak lengkap.");
        }

        // Add IDs if missing and ensure createdAt field
        const currentTime = new Date().toISOString();
        const processedData = importedData.map((site) => {
          return {
            id: site.id || Date.now() + Math.floor(Math.random() * 1000),
            name: site.name,
            url: site.url,
            username: site.username,
            password: site.password,
            createdAt: site.createdAt || currentTime,
          };
        });

        // Confirm before merging or replacing
        if (this.sites.length > 0) {
          if (confirm("Apakah Anda ingin menggabungkan data baru dengan data yang sudah ada? Pilih 'OK' untuk menggabungkan, atau 'Cancel' untuk mengganti semua data.")) {
            // Merge data, avoiding duplicates based on URL
            const existingUrls = new Set(this.sites.map((site) => site.url));
            const newSites = processedData.filter((site) => !existingUrls.has(site.url));
            this.sites = [...this.sites, ...newSites];
          } else {
            // Replace all data
            this.sites = processedData;
          }
        } else {
          // No existing data, just use imported data
          this.sites = processedData;
        }

        this.saveSites();
        this.renderSites();
        this.showNotification(`Berhasil mengimpor ${processedData.length} portal WordPress!`, "success");
      } catch (error) {
        console.error("Import error:", error);
        this.showNotification(`Gagal mengimpor data: ${error.message}`, "error");
      }

      // Reset the file input
      document.getElementById("jsonFileInput").value = "";
    };

    reader.onerror = () => {
      this.showNotification("Gagal membaca file JSON.", "error");
      document.getElementById("jsonFileInput").value = "";
    };

    reader.readAsText(file);
  }

  updateJsonFile() {
    // This is a method to help maintain the JSON file, but it can't directly write to the file
    // due to browser security restrictions. Instead, we'll download an updated version.
    const dataStr = JSON.stringify(this.sites, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

    // Create download link
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", "sites.json");
    linkElement.style.display = "none";

    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);

    this.showNotification("File sites.json telah diperbarui. Silakan ganti file lama di folder 'data'.", "info");
  }

  // Method to save sites to a downloadable JSON file
  downloadUpdatedSitesJson(autoDownload = false) {
    const dataStr = JSON.stringify(this.sites, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

    // Create download link
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", "sites.json");
    linkElement.style.display = "none";

    document.body.appendChild(linkElement);

    // If autoDownload is true, automatically download the file
    if (autoDownload) {
      linkElement.click();
      this.showNotification("File sites.json diperbarui dan diunduh. Silakan ganti file lama di folder 'data'.", "info");
    } else {
      // Otherwise, show a notification with download option
      this.showDownloadPrompt(linkElement);
    }

    document.body.removeChild(linkElement);
  }

  // Shows a special notification with download option
  showDownloadPrompt(downloadLink) {
    // Remove existing notification
    const existing = document.querySelector(".notification-with-action");
    if (existing) {
      existing.remove();
    }

    // Create notification container
    const notification = document.createElement("div");
    notification.className = "notification-with-action info";

    // Create message
    const message = document.createElement("span");
    message.textContent = "Daftar portal telah berubah. Perbarui file sites.json?";
    notification.appendChild(message);

    // Create button container
    const btnContainer = document.createElement("div");
    btnContainer.className = "notification-buttons";

    // Create download button
    const downloadBtn = document.createElement("button");
    downloadBtn.className = "btn btn-sm btn-primary";
    downloadBtn.textContent = "💾 Unduh sites.json";
    downloadBtn.onclick = () => {
      downloadLink.click();
      notification.remove();
    };
    btnContainer.appendChild(downloadBtn);

    // Create dismiss button
    const dismissBtn = document.createElement("button");
    dismissBtn.className = "btn btn-sm btn-secondary";
    dismissBtn.textContent = "✕ Tutup";
    dismissBtn.onclick = () => {
      notification.remove();
    };
    btnContainer.appendChild(dismissBtn);

    notification.appendChild(btnContainer);

    // Add to document
    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => {
      notification.classList.add("show");
    }, 100);

    // Auto-hide after 15 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.classList.remove("show");
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 300);
      }
    }, 15000);
  }

  resetToDefaultJson() {
    if (confirm("Ini akan menghapus semua perubahan dan mengosongkan data. Lanjutkan?")) {
      // Clear localStorage
      localStorage.removeItem("wp_sites");

      // Reset sites to empty array
      this.sites = [];
      this.renderSites();
      this.showNotification("Data berhasil direset", "success");

      // Try to load from the JSON file
      try {
        const xhr = new XMLHttpRequest();
        const path = window.location.href.includes("file:///") ? "data/sites.json" : "/data/sites.json";
        xhr.open("GET", path, false);
        xhr.send(null);

        if (xhr.status === 200) {
          this.sites = JSON.parse(xhr.responseText);
          this.saveSites();
          this.renderSites();
          this.showNotification("Data berhasil dimuat dari sites.json", "success");
        }
      } catch (error) {
        console.error("Note: No default sites.json file found to reload:", error);
        // It's okay if this fails as we've already reset to empty array
      }
    }
  }

  forceReloadFromJson() {
    if (confirm("Ini akan memuat ulang data dari file sites.json dan menggabungkannya dengan data saat ini. Lanjutkan?")) {
      try {
        const xhr = new XMLHttpRequest();
        const path = window.location.href.includes("file:///") ? "data/sites.json" : "/data/sites.json";
        xhr.open("GET", path, false);
        xhr.send(null);

        if (xhr.status === 200) {
          const jsonData = JSON.parse(xhr.responseText);

          // Ask if user wants to merge or replace
          if (this.sites.length > 0 && jsonData.length > 0) {
            if (confirm("Apakah Anda ingin menggabungkan data dari file dengan data yang ada saat ini? Klik OK untuk menggabungkan, Cancel untuk mengganti.")) {
              // Merge: add sites from JSON that don't already exist (by URL)
              const existingUrls = new Set(this.sites.map((site) => site.url));
              const newSites = jsonData.filter((site) => !existingUrls.has(site.url));
              this.sites = [...this.sites, ...newSites];
            } else {
              // Replace: use only the sites from the JSON
              this.sites = jsonData;
            }
          } else {
            // No existing sites, just use the JSON data
            this.sites = jsonData;
          }

          // Save to localStorage
          this.saveSites();
          this.renderSites();
          this.showNotification("Data berhasil dimuat dari sites.json", "success");
        } else {
          this.showNotification("File sites.json tidak ditemukan atau tidak valid", "error");
        }
      } catch (error) {
        console.error("Error loading from sites.json:", error);
        this.showNotification(`Error: ${error.message}`, "error");
      }
    }
  }
}

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
  window.wpManager = new WordPressManager();
});
