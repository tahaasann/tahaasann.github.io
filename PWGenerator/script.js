function generatePassword() {
  var length = document.getElementById("length").value;
  var useUppercase = document.getElementById("uppercase").checked;
  var useNumbers = document.getElementById("numbers").checked;
  var useSpecial = document.getElementById("special").checked;

  var characters = "abcdefghijklmnopqrstuvwxyz";
  var numbers = "0123456789";
  var special = "!@#$%^&*()_+-=[]{}|;':\"<>,.?/\\";

  if(useUppercase) {
      characters += characters.toUpperCase();
  }

  if(useNumbers) {
      characters += numbers;
  }

  if(useSpecial) {
      characters += special;
  }

  var password = "";
  for(var i = 0; i < length; i++) {
      var randomIndex = Math.floor(Math.random() * characters.length);
      password += characters[randomIndex];
  }

  document.getElementById("password").innerHTML = password;
}
