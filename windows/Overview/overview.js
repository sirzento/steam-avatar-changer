const fs = require('fs');
const ipcRenderer = require('electron').ipcRenderer;
loadDateList();

function loadDateList() {
    let data = JSON.parse(fs.readFileSync('./data.json'));

    const element = document.getElementById('dateContainer');
    element.innerHTML = '';

    for(date of data) {
        let innerString = 
        `<div class="row">
            <div class="col-5">
                <img src="../../avatars/`+ date.filePath +`" style="width: 200px; height: 200px;">
            </div>
            <div class="col-7">
                <br>
                <p style='font-size: x-large'>`+date.name+`</p>
                <div>
                    From <span>`+new Date(date.dateFrom).toLocaleDateString('de-DE', {day: '2-digit', month: '2-digit'})+`</span> to <span>`+new Date(date.dateTo).toLocaleDateString('de-DE', {day: '2-digit', month: '2-digit'})+`</span>
                </div>
                <br>
                <input type="button" class="btn btn-outline-info" onclick="JavaScript:editDate('`+date.id+`')" value="Edit">
                <input type="button" class="btn btn-outline-danger" onclick="JavaScript:deleteDate('`+date.id+`')" value="Delete">
            </div>
        </div>`;

        element.innerHTML += innerString;
    }
}

function newDate() {
    ipcRenderer.send('newDate');
}

function editDate(id) {
    ipcRenderer.send('editDate', id);
}

function deleteDate(id) {
    ipcRenderer.send('deleteDate', id);
}

ipcRenderer.on('refreshList', function (event, args) {
    loadDateList();
  });