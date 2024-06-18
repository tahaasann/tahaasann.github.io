document.getElementById('turkish').addEventListener('click', function() {
    changeLanguage('tr');
});

document.getElementById('english').addEventListener('click', function() {
    changeLanguage('en');
});

function changeLanguage(lang) {
    document.querySelectorAll('[data-en]').forEach(function(element) {
        if (lang === 'tr') {
            element.innerText = element.getAttribute('data-tr');
        } else {
            element.innerText = element.getAttribute('data-en');
        }
    });
}
