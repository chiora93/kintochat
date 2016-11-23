function s4() {
  return Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1);
}

function guid() {
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

class KintoChat {
  constructor() {
    this.bucketName = 'kinto-chat';
    this.collectionName = window.location.hash.slice(1);
    this.userName = `Guest#${s4()}`

    // DOM binding
    this.messageList = document.getElementById('messages');
    this.messageForm = document.getElementById('message-form');
    this.messageInput = document.getElementById('message');

    // Kinto
    this.client = this.setupKinto();

    // Events binding
    this.messageForm.addEventListener('submit', this.saveMessage.bind(this));
  }

  setupKinto() {
    console.log('setup kinto...');
    const options = {
      headers: {
        Authorization: `Basic ${btoa('kintochat:tahcotnik')}`
      }
    } 

    const client = new KintoClient('https://kinto.ticabri.com/v1/', options);
    
    client.createBucket(this.bucketName, {
      safe: true,
      permissions: {
        "collection:create": ['system.Authenticated']
      }
    })
    .then(() => {
      client.bucket(this.bucketName).setPermissions({
        'write': []
      }, {patch: true});
    })
    .catch((e) => console.debug('Skipping bucket creation, it probably already exist.', e));

    client.bucket(this.bucketName).createCollection(this.collectionName, {
      permissions: {
        "record:create": ["system.Authenticated"]
      }
    })
    .then(({data}) => {
      this.collectionID = data.id
    })
    .catch(console.error);

    client.bucket(this.bucketName).collection(this.collectionName)
      .listRecords()
      .then(({data}) => data.reverse())
      .then(data => data.forEach(this.displayMessage.bind(this)));

    return client;
  }

  saveMessage(e) {
    e.preventDefault();
    if(this.messageInput.value) {
      console.log(`[save message to kinto] ${this.messageInput.value}`);
      this.client.bucket(this.bucketName).collection(this.collectionName)
        .createRecord({author: this.userName, message: this.messageInput.value})
        .then(result => result.data)
        .then(this.displayMessage.bind(this));
      this.resetMaterialTextField(this.messageInput);
    }
  }

  resetMaterialTextField(element) {
    element.value = '';
    element.parentNode.MaterialTextfield.boundUpdateClassesHandler();
  }

  getMessage(message, author) {
    return (
    `<li class="mdl-list__item mdl-list__item--three-line">
      <span class="mdl-list__item-primary-content">
        <i class="material-icons mdl-list__item-avatar">person</i>
        <span>${author}</span>
        <span class="mdl-list__item-text-body">${message}</span>
      </span>
    </li>`
    );
  }

  displayMessage({message, author}) {
    var container = document.createElement('div');
    container.innerHTML = this.getMessage(message, author);
    this.messageList.firstChild.appendChild(container.firstChild);
  }

}

window.onload = () => {
  window.kintoChat = new KintoChat();
}
