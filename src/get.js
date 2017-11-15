function get(url) {
  return new Promise((fulfill, reject) => {
    const req = new XMLHttpRequest();

    req.onreadystatechange = () => {
      if (req.readyState === XMLHttpRequest.DONE) {
        if (req.status === 200) {
          fulfill(req.responseText);
        } else {
          reject(new Error(`Request status ${req.status} for ${url}`));
        }
      }
    };

    req.open('GET', url, true);
    req.send();
  });
}

function imageAsCanvas(url, width, height) {
  const imageTag = document.createElement('img');
  imageTag.src = url;

  return new Promise((fulfill, reject) => {
    imageTag.onerror = (event) => {
      reject(new Error(event.msg));
    };

    imageTag.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width || imageTag.width;
      canvas.height = height || imageTag.height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(imageTag, 0, 0, canvas.width, canvas.height);

      fulfill(canvas);
    };
  });
}


module.exports = {
  raw: get,
  imageAsCanvas,
};
