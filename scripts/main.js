const pusher_key = '12c789964f052a8c2e77';
const bucket_id = 'kintochat';
const user_pass = 'kintochat:tahcotnik';
const kinto_url = 'https://kinto.ticabri.com/v1/';

function s4() {
  return Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1);
}

class KintoChat {
  constructor() {
    this.bucketName = bucket_id;
    this.collectionName = window.location.hash.slice(1);
    this.userName = `Guest#${s4()}`

    // DOM binding
    this.messagesList = document.getElementById('messages');
    this.messageForm = document.getElementById('message-form');
    this.messageInput = document.getElementById('message');

    // Kinto
    this.client = this.setupKinto();

    // Events binding
    this.messageForm.addEventListener('submit', this.saveMessage.bind(this));

    // Pusher
    Pusher.logToConsole = true;
    var pusher = new Pusher(pusher_key, {
      encrypted: true
    });
    const channelName = `${this.bucketName}-${this.collectionName}-record`;
    const channel = pusher.subscribe(channelName);
    channel.bind('create', data => this.displayMessage(data[0].new));

  }

  setupKinto() {
    console.log('setup kinto...');
    const options = {
      headers: {
        Authorization: `Basic ${btoa(user_pass)}`
      }
    } 

    const client = new KintoClient(kinto_url, options);

    const promises = [];

    promises.push(client.createBucket(this.bucketName, {
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
      .catch((e) => console.debug('Skipping bucket creation, it probably already exist.')));

    promises.push(client.bucket(this.bucketName).createCollection(this.collectionName, {
        permissions: {
          "record:create": ["system.Authenticated"]
        }
      })
      .then(({data}) => {
        this.collectionID = data.id
      })
      .catch(console.error));

    Promise.all(promises)
      .then(() => {
        client.bucket(this.bucketName).collection(this.collectionName)
          .listRecords()
          .then(({data}) => data.reverse())
          .then(data => data.forEach(this.displayMessage.bind(this)));
      });

    return client;
  }

  saveMessage(e) {
    e.preventDefault();
    if(this.messageInput.value) {
      console.log(`[save message to kinto] ${this.messageInput.value}`);
      this.client.bucket(this.bucketName).collection(this.collectionName)
        .createRecord({author: this.userName, message: this.messageInput.value});
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
    this.messagesList.firstChild.appendChild(container.firstChild);
    this.messagesList.scrollTop = this.messagesList.scrollHeight - this.messagesList.getBoundingClientRect().height;
  }

}

window.onload = () => {
  window.kintoChat = new KintoChat();
}
