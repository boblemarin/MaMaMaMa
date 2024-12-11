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
- add svg export
- add svg import and project continuation
- generate and store thumbnails for layers

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
document.querySelector('#menu-bar').addEventListener('click',onMenuBarClick);

window.addEventListener('keydown', onKeyDown );
document.addEventListener('contextmenu', onRightMouseDown, false);



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
  //console.log(event.target.id);
  
  switch(event.target.id) {
  case 'btn_preview':
    document.querySelector('#source-image').classList.toggle('invisible');
    break;
  }
}

//===== RENDERING ==================================================

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

  updateLayers();

}

//=======================================================================
//===== UTILITIES =======================================================
//=======================================================================

function point(x, y) { return {x: x, y: y}; }

function createLayer() { return { color: picker.toHEXString(), visible: true, selected: false, points: [] }; }

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


//===== LAYERS ==================================

function updateLayers() {

  //layersContainer
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

    c += '<div class="layer-color" style="background-color:'+layer.color+'"></div>';

    c += '</div>';

  } 
  /*
  layers.forEach((layer, index) =>  {
    c += '<div class="layer-item';
    if (layer == selectedLayer) c += ' layer-selected';
    c += '" data-index="'+index+'">';

    c += '<input type="checkbox" class="layer-visible"';
    if (layer.visible) c += ' checked';
    c += ' />';

    c += '<div class="layer-color" style="background-color:'+layer.color+'"></div>';

    c += '</div>';
  });
*/

  layersContainer.innerHTML = c;
}



/*let cv = document.getElementById('drawCanvas'),
    ctx = cv.getContext('2d'),
    tcv = document.getElementById('tempCanvas'),
    tctx = tcv.getContext('2d'),
    isMouseDown = false,
    currentStroke = [],
    strokes = [],
    redoStrokes = [],
    sourceImageURL = "",
    width = window.innerWidth,
    height = window.innerHeight,
    dirty = false,
    tdirty = false,
    lineWidth = 3,
    saved = false,
    lineColor = "white";

cv.width = tcv.width = width;
cv.height = tcv.height = height;

document.querySelector('.menu').addEventListener('mousedown',onMenuMouseDown);

document.querySelector('#menuSaveBtn').addEventListener('mousedown',menuSave);
document.querySelector('#menuUndoBtn').addEventListener('mousedown',menuUndo);
document.querySelector('#menuPreviewBtn').addEventListener('mousedown',menuPreview);
document.querySelector('#menuBlackBtn').addEventListener('mousedown',menuBlack);
document.querySelector('#menuWhiteBtn').addEventListener('mousedown',menuWhite);

document.addEventListener('mousedown', onMouseDown);
document.addEventListener('contextmenu', onRightMouseDown, false);
window.addEventListener('keydown',onKeyDown);
window.onbeforeunload = function(event) {
  if (!saved && strokes.length > 0) return "oui";
}
requestAnimationFrame(draw);

if (window.location.search.startsWith('?q=')) {
  sourceImageURL = window.location.search.substring(3);
  loadImage(sourceImageURL);
  // document.querySelector('#sourceDiv').style.backgroundImage = 'url('+window.location.search.substring(3)+')';
}


function menuNew(event) {
  sourceImageURL = prompt('Image URL');
  if (sourceImageURL) {
    redoStrokes.length = 0;
    strokes.length = 0;
    currentStroke.length = 0;
    dirty = true;
    tdirty = true;
    loadImage(sourceImageURL);
  }
}

function menuSave(event) {
  if (event.shiftKey) {
    menuNew();
  } else {
    if (strokes.length) {
      // trim image content
      let minX = 9999, maxX = 0, minY = 9999, maxY = 0;
      // loop scan
      strokes.forEach(function(stroke) {
        stroke.forEach(function(point) {
          minX = Math.min(minX, point[0]);
          maxX = Math.max(maxX, point[0]);
          minY = Math.min(minY, point[1]);
          maxY = Math.max(maxY, point[1]);
        });
      });
      // add borders
      minX -= 50;
      maxX += 50;
      minY -= 50;
      maxY += 50;
      // generate SVG code
      let svg = '<svg x="0px" y="0px" viewBox="0 0 '+(maxX - minX)+' '+(maxY - minY)+'" xmlns="http://www.w3.org/2000/svg" xml:space="preserve" stroke="black" stroke-width="3" fill="none">';
      svg += '<!-- ' + sourceImageURL + ' -->'
      strokes.forEach(function(stroke) {
        let first = true;
        stroke.forEach(function(pos) {
          if (first) {
            first = false;
            svg += '<path d="M' + (pos[0]-minX) + ',' + (pos[1]-minY);
          } else {
            svg += ' L' + (pos[0]-minX) + ',' + (pos[1]-minY);
          }
        });
        svg += '"/>';
      });
      svg += '</svg>';


      var d = new Date();

      var datestring = d.getFullYear() + "-" + ("0"+(d.getMonth()+1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2) + " " + ("0" + d.getHours()).slice(-2) + "-" + ("0" + d.getMinutes()).slice(-2);
      
      download(datestring + ".svg", svg);
      saved = true;
    }
  }
}

function menuUndo(event) {
  if (event.shiftKey) {
    redo();
  } else {
    undo();
  }
}

function menuPreview() {
  document.querySelector('#sourceDiv').classList.toggle("invisible");
}

function menuBlack() {
  lineColor = "black";
  dirty = true;
  tdirty = true;
}

function menuWhite() {
  lineColor = "white";
  dirty = true;
  tdirty = true;
}

function onMenuMouseDown(event) {
  event.stopImmediatePropagation();
}

function onMouseDown(event) {
  if (isMouseDown && currentStroke.length > 1) {
    strokes.push(currentStroke);
    currentStroke = [];
    dirty = true;
    tdirty = true;
  }
  // console.log('down');
  isMouseDown = true;
  redoStrokes.length = 0;
  currentStroke = [[event.pageX, event.pageY]];
  event.preventDefault();
  event.stopImmediatePropagation();

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

function onRightMouseDown(event) {
  event.preventDefault();
  event.stopImmediatePropagation();
  return false;
}

function onMouseMove(event) {
  // console.log('move');
  if (isMouseDown) {
    currentStroke.push([event.pageX, event.pageY]);
    tdirty = true;
  }
}

function onMouseUp(event) {
  // console.log('up');
  if (isMouseDown) {
    isMouseDown = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    if (currentStroke.length > 1) {
      strokes.push(currentStroke);
      currentStroke = [];
      dirty = true;
      tdirty = true;
    }
  }
}

function onKeyDown(event) {
  switch(event.keyCode) {
    case 8: // backspace, undo/redo
      if (event.shiftKey) redo();
      else undo();
      break;

    default: 
      //console.log(event.keyCode);
      break;
  };
}

function draw() {
  if (dirty) {
    cv.width = width;
    cv.height = height;
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = lineColor;
    strokes.forEach(function(stroke) {
      let first = true;
      stroke.forEach(function(pos) {
      if (first) {
        ctx.moveTo(pos[0],pos[1]);
        first = false;
      } else {
        ctx.lineTo(pos[0],pos[1]);
      }
      });
    });
    ctx.stroke();
    dirty = false;
  }

  if (tdirty) {
    tcv.width = width;
    tcv.height = height;
    tctx.lineWidth = lineWidth;
    tctx.strokeStyle = lineColor;
    let first = true;
    currentStroke.forEach(function(pos) {
      if (first) {
        tctx.moveTo(pos[0],pos[1]);
        first = false;
      } else {
        tctx.lineTo(pos[0],pos[1]);
      }
    });
    tctx.stroke();
    tdirty = false;
  }

  requestAnimationFrame(draw);
}

function undo() {
  if (strokes.length) {
    redoStrokes.push(strokes.pop());
    dirty = true;
  }
}

function redo() {
  if (redoStrokes.length) {
    strokes.push(redoStrokes.pop());
    dirty = true;
  }
}


function loadImage(url) {
  document.querySelector('#sourceDiv').style.backgroundImage = 'url('+url+')';
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
*/