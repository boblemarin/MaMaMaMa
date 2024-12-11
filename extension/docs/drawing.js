/*

OK - add zooming function with mouse wheel
OK - use flexbox for tools layout
OK - show layers in reversed order in side panel
OK - listen to up/down keys to move layer 
OK - listen to delete key to delete layer (with confirm prompt)
OK - listen to click on layer div to select it
OK - improve styling of layers list
OK - listen to click on visibility checkbox (change model, render)
OK - add scrolling to layers list
OK - add interactivity to layer management interface
OK - add source image toggle
OK - add svg export
OK - warn before closing tab
OK - generate thumbnails for layers
- optimize thumbnail system
- add svg import and project continuation
- write documentation
- add button for documentation
- auto-save current project in browser data

*/


let drawingContainer = document.getElementById('drawing'),
    drawingBG = document.getElementById('drawing-background'),
    layersContainer = document.getElementById('layers'),
    rcv = document.getElementById('render'),
    tmpcv = document.getElementById('tool-preview'),
    startingPoint = document.createElement('div'),

    drawingWidth = drawingContainer.clientWidth,
    drawingHeight = drawingContainer.clientHeight,
    sourceImage = null,
    isDrawingShape = false,
    layers = [],
    lineWidth = 2,
    zoomedIn = false,
    zoomFactor = 3,
    lineColor = 'white',
    saved = false,
    selectedLayer = null,
    tempLayer = null;

//==========================================================
//===== INIT PROCEDURE =====================================
//==========================================================

// set picker defaults
jscolor.presets.default = {
  position:'left', smartPosition:false, alphaChannel:false, 
  palette:'#914E72, #0078BF, #00A95C, #3D5588, #FFE800, #FF48B0, #82D8D5, #000000',
  height:180, mode:'HSV', closeButton:true, closeText:'OK', 
  buttonHeight:22, sliderSize:18
};

var input = document.createElement('button');
input.classList.add('color-picker');
var opts = {};
let picker = new JSColor(input, opts); // 'JSColor' is an alias to 'jscolor'
picker.onInput = updateColor;
document.querySelector('#colors').appendChild(input);
picker.fromRGBA(240,20,0,255);
//updateColor();

startingPoint.classList.add('start-point');
if (window.location.search.startsWith('?q=')) {
  sourceImage = window.location.search.substring(3);
  document.querySelector('#source-image').style.backgroundImage = 'url('+sourceImage+')';
}

resize();

drawingBG.addEventListener('mousedown', onDrawingMouseDown);
drawingBG.addEventListener('mousemove', onDrawingMouseMove);
drawingBG.addEventListener('wheel', onDrawingMouseWheel, {passive: true});
layersContainer.addEventListener('click',onLayersContainerClick);
document.querySelector('#file-input').addEventListener("change", onFileInputChange);
document.querySelector('#menu-bar').addEventListener('click',onMenuBarClick);
window.addEventListener('keydown', onKeyDown );
document.addEventListener('contextmenu', onRightMouseDown, false);
window.onbeforeunload = function(event) {
  if (!saved && layers.length > 0) return "oui";
}

//=====================================================
//===== EVENT LISTENERS ===============================
//=====================================================

function onDrawingMouseDown(event) {
  //console.log(event);
  event.preventDefault();
  event.stopImmediatePropagation();

  let px = event.offsetX, py = event.offsetY;

  if (!isDrawingShape) {
    // add first point to shape
    isDrawingShape = true;
    startLayer();
    tempLayer.points.push(point(px, py));

    startingPoint.style.left = px - 10 + 'px';
    startingPoint.style.top = py - 10 + 'px';
    drawingContainer.appendChild(startingPoint);

  } else {
    if (distanceFromFirstPoint(px, py) < 10) {
      // close shape, store layer, clean rendering
      isDrawingShape = false;
      completeLayer();
      startingPoint.remove();
      drawingBG.classList.remove('closing-point');
      renderTempShape();
      renderLayers();
    } else {
      // add point to shape in current layer
      tempLayer.points.push(point(px, py));  
    }  
  }
}

function onDrawingMouseWheel(event) {
  //console.log(event);
  if (event.deltaY<0) {
    // zoom in
    let c = event.layerX + 'px ' + event.layerY + 'px';
    //console.log(c);
    drawingContainer.style.transformOrigin = c;
    drawingContainer.style.transform = 'scale('+zoomFactor+','+zoomFactor+')';
    zoomedIn = true;
  } else {
    // zoom out
    drawingContainer.style.transform = 'scale(1,1)';
    zoomedIn = false;
  }
}

function onDrawingMouseMove(event) {
  if (!isDrawingShape) return;

  let px = event.offsetX, py = event.offsetY;
  renderTempShape(px, py);
  // switch cursor when finalizing shape
  if (distanceFromFirstPoint(px, py) < 10 ) {
    drawingBG.classList.add('closing-point');
  } else {
    drawingBG.classList.remove('closing-point');
  }
}

function onKeyDown(event) {
  event.preventDefault();
  event.stopImmediatePropagation();

  switch(event.keyCode) {
  case 8: // backspace
    if (!isDrawingShape) return;
    if (tempLayer.points.length>1) tempLayer.points.pop();
    else cancelLayer();
    renderTempShape();
    break;
  case 27: // ESC
    cancelLayer();
    renderTempShape();
    break;
  case 38: // UP
    moveLayerUp();
    break;
  case 40: // DOWN
    moveLayerDown();
    break;
  case 46: // DELETE
    deleteLayer(event.shiftKey);
    break;

/*  default:
    console.log('key: ' + event.keyCode);
    break;*/
  }
}

function onRightMouseDown(event) {
  event.preventDefault();
  event.stopImmediatePropagation();
  return false;
}

function onLayersContainerClick(event) {
  //console.log(event);
  switch(event.target.className) {
  case 'layer-item':
    selectLayer(layers[event.target.dataset.index]);
    break;
  case 'layer-visible':
    let cb = event.target;
    let i = event.target.parentElement.dataset.index;
    layers[i].visible = cb.checked;
    renderLayers();
    break;
  }
}

function onMenuBarClick(event) {
  //console.log(event);
  
  switch(event.target.id) {
  case 'btn_preview':
    document.querySelector('#source-image').classList.toggle('invisible');
    break;
  case 'btn_save':
    if (event.altKey) menuLoad();
    else menuSave();
    break;
  }

}


//=====================================================
//===== RENDERING =====================================
//=====================================================

function clearTempShape() {
  tmpcv.width = drawingWidth;
  tmpcv.height = drawingHeight;
}

function renderTempShape(mouseX, mouseY) {
  clearTempShape();
  if (!tempLayer) return;
  let n = tempLayer.points.length;
  if (n<1) return;

  let ctx = tmpcv.getContext('2d');  
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = lineColor;

  ctx.moveTo(mouseX,mouseY);
  while(--n >= 0) {
    ctx.lineTo(tempLayer.points[n].x,tempLayer.points[n].y);
  }
  ctx.stroke();
}

function renderLayers() {
  updateLayers();

  rcv.width = drawingWidth;
  rcv.height = drawingHeight;
  let n = layers.length;
  if (n<1) return;

  let ctx = rcv.getContext('2d');
  layers.forEach((layer) =>  {
    let n = layer.points.length;
    if (layer.visible && n) {
      ctx.fillStyle = layer.color
      ctx.beginPath();
      ctx.moveTo(layer.points[0].x,layer.points[0].y);
      while(--n>0) {
        ctx.lineTo(layer.points[n].x,layer.points[n].y);
      }
      ctx.closePath();
      ctx.fill();
    }
  });
}


//=====================================================
//===== LAYERS ==================================
//=====================================================

function updateLayers() {
  let c = '';
  let index = layers.length;
  while(--index >= 0) {
    let layer = layers[index];
    c += '<div class="layer-item';
    if (layer == selectedLayer) c += ' layer-selected';
    c += '" data-index="'+index+'">';

    c += '<input type="checkbox" class="layer-visible"';
    if (layer.visible) c += ' checked';
    c += ' />';

    //c += '<div class="layer-color" style="background-color:'+layer.color+'"></div>';
    c += '<div class="layer-color" style="background-image:url('+thumbnailForLayer(layer)+')"></div>';

    c += '</div>';

  } 

  layersContainer.innerHTML = c;
}

function thumbnailForLayer(layer) {
  let width = 32, height = 32, canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  let ctx = canvas.getContext('2d');

  let minX = 9999, maxX = 0, minY = 9999, maxY = 0, ratio = 1, n = layer.points.length;

  layer.points.forEach(function(point) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  });
  ratio = Math.max((maxX - minX) / width, (maxY - minY) / height);

  let offsetX = (width - (maxX - minX) / ratio) / 2;
  let offsetY = (height - (maxY - minY) / ratio) / 2;

  if (n) {
    ctx.fillStyle = layer.color
    ctx.beginPath();
    ctx.moveTo(offsetX + (layer.points[0].x - minX) / ratio, offsetY + (layer.points[0].y - minY) / ratio);
    while(--n>0) {
      ctx.lineTo(offsetX + (layer.points[n].x - minX) / ratio, offsetY + (layer.points[n].y - minY) / ratio);
    }
    ctx.closePath();
    ctx.fill();
  }

  return canvas.toDataURL('image/png');
}


//=======================================================================
//===== UTILITIES =======================================================
//=======================================================================

function point(x, y) { return {x: x, y: y}; }

function createLayer() { return { color: picker.toHEXString(), visible: true, points: [] }; }

function startLayer() {
  tempLayer = createLayer();
  selectedLayer = tempLayer;
  updateLayers();
}

function completeLayer() {
  layers.push(tempLayer);
  selectedLayer = tempLayer;
  tempLayer = null;
}

function cancelLayer() {
  if (!isDrawingShape) return;
  tempLayer = null;
  startingPoint.remove();
  isDrawingShape = false;
  drawingContainer.classList.remove('closing-point');
}

function selectLayer(layer) {
  if (isDrawingShape || layer == selectedLayer) return;
  selectedLayer = layer;
  picker.fromString(selectedLayer.color);
  updateLayers();
}

function deleteLayer(force) {
  if (!selectedLayer || isDrawingShape) return;
  let i = layers.indexOf(selectedLayer);
  if (i < 0) return;
  if (force || window.confirm("Effacer le calque ?")) {
    layers.splice(i, 1);
    if (tempLayer == selectedLayer) tempLayer = null;
    selectedLayer = null;
    renderLayers();
  }
}

function moveLayerDown() {
  if (!selectedLayer) {
/*    if (tempLayer || isDrawingShape) return;
    selectedLayer = layers[layers.length-1];
    updateLayers();*/
    return;
  } 
  let i = layers.indexOf(selectedLayer);
  if (i < 1) return;
  let t = layers[i-1];
  layers[i-1] = layers[i];
  layers[i] = t;
  renderLayers();
}

function moveLayerUp() {
  if (!selectedLayer) {
/*    if (tempLayer || isDrawingShape) return;
    selectedLayer = layers[0];
    updateLayers();*/
    return;
  } 
  let i = layers.indexOf(selectedLayer);
  if (i > layers.length - 2) return;
  let t = layers[i+1];
  layers[i+1] = layers[i];
  layers[i] = t;
  renderLayers();
}

function updateColor() {
  let color = picker.toHEXString();
  document.querySelector(".color-picker").style.background = color;

  if (tempLayer) tempLayer.color = color;
  if (selectedLayer) selectedLayer.color = color;
  renderLayers();
}

function distanceFromFirstPoint(x,y) {
  if (tempLayer.points.length < 3) return 999999;
  let p = tempLayer.points[0];
  return Math.sqrt(Math.pow(p.x-x,2)+Math.pow(p.y-y,2));
}

function resize() {
  drawingWidth = drawingContainer.clientWidth;
  drawingHeight = drawingContainer.clientHeight;
  rcv.width = drawingWidth;
  rcv.height = drawingHeight;
  tmpcv.width = drawingWidth;
  tmpcv.height = drawingHeight;
}

function menuLoad() {
  document.querySelector('#file-input').click();
}

function onFileInputChange(event) {

  if (event.target.files && event.target.files[0]) {
    var myFile = event.target.files[0];
    var reader = new FileReader();
    
    reader.addEventListener('load', function (e) {
      let loadedSVG = e.target.result;
      console.log(loadedSVG);
    });
    
    reader.readAsBinaryString(myFile);
  }   
}

function menuSave() {
  if (layers.length == 0) return;

  // trim image content
  let minX = 9999, maxX = 0, minY = 9999, maxY = 0;
  if (false) {
    // loop scan
    layers.forEach(function(layer) {
      layer.points.forEach(function(point) {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      });
    });
    // add borders
    minX -= 50;
    maxX += 50;
    minY -= 50;
    maxY += 50;
  } else {
    minX = 0;
    minY = 0;
    maxX = drawingWidth;
    maxY = drawingHeight
  }

  // generate SVG code
  let svg = '<svg x="0px" y="0px" width="'+(maxX - minX)+'px" height="'+(maxY - minY)+'px" viewBox="0 0 '+(maxX - minX)+' '+(maxY - minY)+'" xmlns="http://www.w3.org/2000/svg" xml:space="preserve" ';
  svg += 'imageReference="' + sourceImage + '">'
  layers.forEach(function(layer) {
    svg += '<path fill="'+layer.color+'" stroke="none" d="'
    let first = true;
    layer.points.forEach(function(point) {
      if (first) {
        first = false;
        svg += 'M' + (point.x-minX) + ',' + (point.y-minY);
      } else {
        svg += ' L' + (point.x-minX) + ',' + (point.y-minY);
      }
    });
    svg += ' Z"/>';
  });
  svg += '</svg>';

  var d = new Date();
  var datestring = d.getFullYear() + "-" + ("0"+(d.getMonth()+1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2) + " " + ("0" + d.getHours()).slice(-2) + "-" + ("0" + d.getMinutes()).slice(-2);
  download(datestring + ".svg", svg);
  saved = true;
}


function download(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}
