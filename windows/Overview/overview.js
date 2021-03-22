const fs = require('fs');


function loadDateList() {
    let data = JSON.parse(fs.readFileSync('../../data.json'));

    for(date of data) {
        
    }
}