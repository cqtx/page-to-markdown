/**
 * Page to Markdown — options page
 * Saves preferences to browser.storage.local.
 */

var checkbox = document.getElementById("include-images");
var saved = document.getElementById("saved");

browser.storage.local.get("includeImages").then(function (result) {
  checkbox.checked = result.includeImages !== false;
});

checkbox.addEventListener("change", function () {
  browser.storage.local.set({ includeImages: this.checked }).then(function () {
    saved.classList.add("show");
    setTimeout(function () { saved.classList.remove("show"); }, 1500);
  });
});