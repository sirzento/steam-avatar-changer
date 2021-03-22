const fs = require('fs');
const ipcRenderer = require('electron').ipcRenderer;
loadDateList();

function loadDateList() {
    let data = JSON.parse(fs.readFileSync('./data.json'));

    const element = document.getElementById('dateContainer');

    for(date of data) {
        let innerString = 
        `<div class="row">
            <div class="col-4">
                <img src="../../avatars/`+ date.filePath +`" style="width: 200px; height: 200px;">
            </div>
            <div class="col-8">
                <br>
                <p>`+date.name+`</p>
                <div>
                    From <span>`+date.dateFrom+`</span> to <span>`+date.dateTo+`</span>
                </div>
                <input type="button" class="btn btn-outline-info" onclick="JavaScript:edit('`+date.name+`')" value="Edit">
                <input type="button" class="btn btn-outline-danger" onclick="JavaScript:delete('`+date.name+`')" value="Delete">
            </div>
        </div>`;

        element.innerHTML += innerString;
    }
}

function newDate() {
    ipcRenderer.send('newDate');
}