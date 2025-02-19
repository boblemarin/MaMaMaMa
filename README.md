<img src="https://raw.githubusercontent.com/boblemarin/mamamama/master/extension/icon128.png" />

# MaMaMaMa

A Chromium extension that allows to draw on top of any existing image in the style of outsider artist Marie Bodson, and export the result as a vector image (in SVG format). 

Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/mamamama/adinkhcmlcgpgkehmiednaihmejcbkci).

<img src="https://raw.githubusercontent.com/boblemarin/MaMaMaMa/refs/heads/main/promo_header.png">

## Usage

Once the extension is installed, there will be a clickable icon.
Don't forget you can pin the extension to your browser bar, having it at hand for emergencies.

Surf the web and find an inspiring image.  
Click the extension icon, then hover the selected image in the page.  
You should see a red dotted border appearing around it.  
If that's the case, press the left mouse button and a new tab will be created, showing the image inside of a drawing interface.

## Drawing interface :

Use left mouse button inside the drawing area to start a shape. Then move the cursor and click again to add points to the shape. A circle appears at the first point, and must be clicked to close the path. A path must have at least three points to be closed.

While drawing a shape :
  - use `<backspace>` to remove the last point
  - use `<escape>` to cancel the shape

Once a path has been closed, a layer is created for it and is selected. You can see which layer is selected in the layer list on the right.

The new layer is assigned the current color picker color value. You can use the color picker to change the selected layer color. Already used colors also appear as a quick palette below the picker.

Layers can be re-arranged with the mouse by dragging them vertically. The selected layer is highlighted in the drawing area, even if it is hidden below another layer.

While a layer is selected, the following keyboard shortcuts are available :
- `<up>` and `<down>` to change the layer stacking position
- `<shift>`+`<up>` and `<shift>`+`<down>` to send the layer on top/bottom of the stack
- `<delete>` to delete the layer (triggers a confirmation dialog)
- `<shift>`+`<delete>` to delete the layer without the dialog

You can also hide a layer by clicking the visibility checkbox, situated on the left side of the layer column. `<shift>` + click the checkbox to toggle all layers visibility at once.

Zoom with mouse wheel. Zoom is only off or x2. Zooming is centered around the mouse cursor position at the time of its activation. Trial and error is sometimes required to get the most confortable zooming area.


Menu (bottom-right) :

- The (photo) button toggles the visibility of the reference image.
- Use the (save) button to download a SVG version of the drawing.
- Use `<alt>` + (save) button to load a previously saved SVG file and continue working on it.

## Credits

Developed by boblemarin for La "S" Grand Atelier in Vielsalm, Belgium.
