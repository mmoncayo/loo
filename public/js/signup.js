$(document).ready(function() {
  const loginForm = $("form.signup");
  const email = $("input#userEmail");
  const password = $("input#userPassword");

  // When the form is submitted, we validate there's an email and password entered
  loginForm.on("submit", function(event) {
    event.preventDefault();
    $("#errorMessage").text();
    var userData = {
      email: email.val().trim(),
      password: password.val().trim()
    };

    if (!userData.email || !userData.password) {
      return;
    }
    // If we have an email and password, run the signupUser function
    signupUser(userData);
    email.val("");
    password.val("");
  });

  // signupUser does a post to our "api/login" route and if successful, redirects us the the members page
  function signupUser(userData) {
    $.post("/api/signup", userData)
      .then(function(data, status) {
        console.log(status);
        console.log(data);
        window.location.replace("/search");
        // If there's an error, log the error
      })
      .catch(function(err) {
        if(err.status == 409)
        {
          console.log(err.responseJSON.message);
          $("#errorMessage").text(err.responseJSON.message);
        }
        console.log(err);
      });
  }
});
