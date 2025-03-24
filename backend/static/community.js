const postForm = document.getElementById("post-form");
const postsDiv = document.getElementById("posts");

// Handle form submission
postForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Collect form data
  const formData = new FormData(postForm);

  // Send POST request to the backend
  const response = await fetch("/community/posts", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  // Display updated posts
  displayPosts(data.posts);
  postForm.reset(); // Clear the form
});

// Fetch and display posts on page load
(async () => {
  const response = await fetch("/community/posts");
  const posts = await response.json();
  displayPosts(posts);
})();

// Function to display posts
function displayPosts(posts) {
  postsDiv.innerHTML = posts
    .map(
      (post) => `
      <div class="post">
        <h3>${post.title}</h3>
        <p>${post.description}</p>
        <p><strong>Location:</strong> ${post.location}</p>
        <p><strong>Urgency:</strong> ${post.urgency}</p>
      </div>
    `
    )
    .join("");
}