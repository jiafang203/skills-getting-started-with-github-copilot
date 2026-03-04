document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;
        const participantsList = details.participants.length > 0 
          ? details.participants.map(p => `<li><span>${p}</span><button class="delete-participant" data-activity="${name}" data-email="${p}" title="Remove participant">×</button></li>`).join('') 
          : '<li style="color: #999;">No participants yet</li>';

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <strong>Participants:</strong>
            <ul class="participants-list">
              ${participantsList}
            </ul>
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add event listeners for delete buttons
        activityCard.querySelectorAll(".delete-participant").forEach(btn => {
          btn.addEventListener("click", async (e) => {
            e.preventDefault();
            const activity = btn.dataset.activity;
            const email = btn.dataset.email;
            if (confirm(`Are you sure you want to remove ${email} from ${activity}?`)) {
              await deleteParticipant(activity, email);
            }
          });
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        
        // Update the activity card with the newly registered participant
        await updateActivityCard(activity);
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Function to delete a participant from an activity
  async function deleteParticipant(activityName, email) {
    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activityName)}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message || "Participant removed successfully";
        messageDiv.className = "success";
        messageDiv.classList.remove("hidden");
        
        // Refresh activities list
        fetchActivities();
        
        // Hide message after 5 seconds
        setTimeout(() => {
          messageDiv.classList.add("hidden");
        }, 5000);
      } else {
        messageDiv.textContent = result.detail || "Failed to remove participant";
        messageDiv.className = "error";
        messageDiv.classList.remove("hidden");
      }
    } catch (error) {
      messageDiv.textContent = "Failed to remove participant. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error removing participant:", error);
    }
  }

  // Function to update a specific activity card with fresh data
  async function updateActivityCard(activityName) {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      if (!activities[activityName]) {
        return;
      }

      const details = activities[activityName];
      const participantsList = details.participants.length > 0 
        ? details.participants.map(p => `<li><span>${p}</span><button class="delete-participant" data-activity="${activityName}" data-email="${p}" title="Remove participant">×</button></li>`).join('') 
        : '<li style="color: #999;">No participants yet</li>';

      // Find and update the participants section in the card
      const cards = document.querySelectorAll(".activity-card");
      for (let card of cards) {
        if (card.querySelector("h4").textContent === activityName) {
          const participantsSection = card.querySelector(".participants-list");
          participantsSection.innerHTML = participantsList;

          // Re-attach event listeners for the new delete buttons
          card.querySelectorAll(".delete-participant").forEach(btn => {
            btn.addEventListener("click", async (e) => {
              e.preventDefault();
              const activity = btn.dataset.activity;
              const email = btn.dataset.email;
              if (confirm(`Are you sure you want to remove ${email} from ${activity}?`)) {
                await deleteParticipant(activity, email);
              }
            });
          });
          break;
        }
      }
    } catch (error) {
      console.error("Error updating activity card:", error);
    }
  }

  // Initialize app
  fetchActivities();
});
