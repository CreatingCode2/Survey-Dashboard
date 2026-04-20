fetch('https://script.google.com/macros/s/AKfycbyq_MQYSZduVAftUiE9EQ1y8hdlqfU4FCGquP0--BmDzHemCOHnN4w2qEUZtmdyXwxz/exec')
  .then(r => console.log('HTTP', r.status))
  .catch(console.error);
