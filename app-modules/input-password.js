// password-input.js
// read password from node console
// from article http://stackoverflow.com/questions/4708787/get-password-from-input-using-node-js


module.exports = {
  foo: function () {
    // whatever
    console.log('foo!');
   get_password('input foo password:');
  },
  bar: function () {
    // whatever
  }
};


var stdin = process.openStdin()
    , tty = require('tty')


// Get a password from the console, printing stars while the user types
var get_password = function(prompt) {
  console.log(prompt);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  tty.setRawMode(true);  
  password = ''
  process.stdin.on('data', function (char) {
    char = char + ""

    switch (char) {
    case "\n": case "\r": case "\u0004":
      // They've finished typing their password
      tty.setRawMode(false)
      console.log("\nyou entered: "+password)
      stdin.pause()
      break
    case "\u0003":
      // Ctrl C
      console.log('Cancelled')
      process.exit()
      break
    default:
      // More passsword characters
      //process.stdout.write('*')
      password += char
      break
    }
  });
}
