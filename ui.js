$(async function() {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $favoritedArticles = $("#favorited-articles");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navWelcome = $("#nav-welcome");
  const $navUserProfile = $("#nav-user-profile");
  const $navLogOut = $("#nav-logout");
  const $navSubmit = $("#nav-submit");
  const $userProfile = $("#user-profile");
  const $navMyStories = $("#nav-my-stories");
  const $navMyFavorites = $('#nav-favorites');

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function() {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function() {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  // event handler for submit
  $navMyStories.on("click", function() {
    hideElements();
    if (currentUser) {
      $userProfile.hide();
      $favoritedArticles.hide();
      generateMyStories();
      $ownStories.show();
      $('.trash-can').show();
    }
  });

  // event handler for submit
  $navSubmit.on("click", function() {
    if (currentUser) {
      hideElements();
      //$allStoriesList.show();
      $submitForm.slideToggle();
    }
  });

  // event handler for submit
  $navMyFavorites.on("click", function() {
    hideElements();
    if (currentUser) {
      $userProfile.hide();
      generateMyfavorited();
      $favoritedArticles.show();
      $('.star').show()

      
    }
  });

  /**
   * Event Handler for Clicking favorit icon 
   */
  
  
  $('body').on('click', '.star', async function(e){
    const $e = $(e.target);
    const storyId = $e.closest('li').attr("id")
    
    if ($e.hasClass("far")){
      await currentUser.addFavorite(storyId)
      $e.closest("i").toggleClass("fas far")
      //console.log("fav")
      return;
    }

    if ($e.hasClass("fas")){
      await currentUser.removeFavorite(storyId);
      $e.closest("i").toggleClass("far fas")
      //console.log("unfav")
      return;
    }
  });

  $('body').on('click', '.trash-can', async function(e){
    const $e = $(e.target);
    const $sId = $e.closest('li').attr("id")
    const $user = currentUser;
    await storyList.deleteStory($user, $sId);
    $($e).closest('li').remove();
    console.log($e);

  });

   /* see if a specific story is in the user's list of favorites */

   function isFavorite(story) {
    let favStoryIds = new Set();
    if (currentUser) {
      favStoryIds = new Set(currentUser.favorites.map(obj => obj.storyId));
    }
    return favStoryIds.has(story.storyId);
  }



  /**
   * Submit article event handler.
   */

   $submitForm.on("submit", async function(e){
     e.preventDefault(); // prevent default form/page refresh

     //submit from input data
     const title = $('#title').val();
     const url = $('#url').val();
     const author = $('#author').val();
     const username = currentUser.username;
     const hostName = getHostName(url);

    const storyData = await storyList.addStory(currentUser, {
      title,
      author,
      url,
      username
    });

    // generate new story Mark up
    const $li = $(`
      <li id="${storyData.storyId}" class="id-${storyData.storyId}">
      <span class="trash-can hidden">
      <i class="fas fa-trash-alt"></i>
      </span>
      <span class="star hidden">
      <i class="far fa-star"></i>
      </span>
        <a class="article-link" href="${url}" target="a_blank">
          <strong>${title}</strong>
        </a>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-author">by ${author}</small>
        <small class="article-username">posted by ${username}</small>
      </li>
    `);
    
    $allStoriesList.prepend($li);

    // hide the form and reset it
    $submitForm.slideUp("slow");
    $submitForm.trigger("reset");


   });



  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", function() {
    $allStoriesList.show();
    $('.trash-can').hide();
    
    
  });

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
     
      showNavForLoggedInUser();
      generateProfile();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();

    // get user profile
    generateProfile()

    
  }

  function generateProfile(){
    // SHOW NAME 
    $('#profile-name').text(`Name: ${currentUser.name}`);
    // SHOW USER NAME 
    $('#profile-username').text(`Username: ${currentUser.username}`);
    // formated account creation display 
    $('#profile-account-date').text(`Account Created: ${currentUser.createdAt.slice(0, 10)}`);
    // set username to nav bar
    $navUserProfile.text(`${currentUser.username}`);
    }



  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }

  function generateMyStories() {
    $ownStories.empty();

    // if the user has no stories that they have posted
    if (currentUser.ownStories.length === 0) {
      $ownStories.append("<h5>No stories added by user yet!</h5>");
    } else {
      // for all of the user's posted stories
      for (let story of currentUser.ownStories) {
        // render each story in the list
        let ownStoryHTML = generateStoryHTML(story, true);
        $ownStories.append(ownStoryHTML);
       
      }
    }

    $ownStories.show();
    
  }

  function generateMyfavorited() {
    $favoritedArticles.empty();

    // if the user has no stories that they have posted
    if (currentUser.favorites.length === 0) {
      $favoritedArticles.append("<h5>No favorite stories yet!</h5>");
    } else {
      // for all of the user's posted stories
      for (let story of currentUser.favorites) {
        // render each story in the list
        let favStoryHTML = generateStoryHTML(story, true);
        $favoritedArticles.append(favStoryHTML);
      }
    }

    $favoritedArticles.show();
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);
    let star = isFavorite(story) ? "fas" : "far";

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
      <span class="trash-can hidden">
      <i class="fas fa-trash-alt"></i>
      </span>
      <span class="star hidden">
      <i class="${star} fa-star"></i>
      </span>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $userProfile,
      $loginForm,
      $createAccountForm
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $userProfile.hide();
    $(".main-nav-links, #user-profile").toggleClass("hidden");
    // toggle favorit ican bassed on logged in user
    $('.star').toggleClass("hidden");
    $navWelcome.show();
    $navLogOut.show();
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});
