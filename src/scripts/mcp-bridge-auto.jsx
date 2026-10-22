// mcp-bridge-auto.jsx
// Auto-running MCP Bridge panel for After Effects

// Remove #include directives as we define functions below
/*
#include "createComposition.jsx"
#include "createTextLayer.jsx"
#include "createShapeLayer.jsx"
#include "createSolidLayer.jsx"
#include "setLayerProperties.jsx"
*/

// --- Function Definitions ---

// --- createComposition (from createComposition.jsx) --- 
function createComposition(args) {
    try {
        var name = args.name || "New Composition";
        var width = parseInt(args.width) || 1920;
        var height = parseInt(args.height) || 1080;
        var pixelAspect = parseFloat(args.pixelAspect) || 1.0;
        var duration = parseFloat(args.duration) || 10.0;
        var frameRate = parseFloat(args.frameRate) || 30.0;
        var bgColor = args.backgroundColor ? [args.backgroundColor.r/255, args.backgroundColor.g/255, args.backgroundColor.b/255] : [0, 0, 0];
        var newComp = app.project.items.addComp(name, width, height, pixelAspect, duration, frameRate);
        if (args.backgroundColor) {
            newComp.bgColor = bgColor;
        }
        return JSON.stringify({
            status: "success", message: "Composition created successfully",
            composition: { name: newComp.name, id: newComp.id, width: newComp.width, height: newComp.height, pixelAspect: newComp.pixelAspect, duration: newComp.duration, frameRate: newComp.frameRate, bgColor: newComp.bgColor }
        }, null, 2);
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() }, null, 2);
    }
}

// --- createTextLayer (from createTextLayer.jsx) ---
function createTextLayer(args) {
    try {
        var compName = args.compName || "";
        var text = args.text || "Text Layer";
        var position = args.position || [960, 540]; 
        var fontSize = args.fontSize || 72;
        var color = args.color || [1, 1, 1]; 
        var startTime = args.startTime || 0;
        var duration = args.duration || 5; 
        var fontFamily = args.fontFamily || "Arial";
        var alignment = args.alignment || "center"; 
        var comp = null;
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem && item.name === compName) { comp = item; break; }
        }
        if (!comp) {
            if (app.project.activeItem instanceof CompItem) { comp = app.project.activeItem; } 
            else { throw new Error("No composition found with name '" + compName + "' and no active composition"); }
        }
        var textLayer = comp.layers.addText(text);
        var textProp = textLayer.property("ADBE Text Properties").property("ADBE Text Document");
        var textDocument = textProp.value;
        textDocument.fontSize = fontSize;
        textDocument.fillColor = color;
        textDocument.font = fontFamily;
        if (alignment === "left") { textDocument.justification = ParagraphJustification.LEFT_JUSTIFY; } 
        else if (alignment === "center") { textDocument.justification = ParagraphJustification.CENTER_JUSTIFY; } 
        else if (alignment === "right") { textDocument.justification = ParagraphJustification.RIGHT_JUSTIFY; }
        textProp.setValue(textDocument);
        textLayer.property("Position").setValue(position);
        textLayer.startTime = startTime;
        if (duration > 0) { textLayer.outPoint = startTime + duration; }
        return JSON.stringify({
            status: "success", message: "Text layer created successfully",
            layer: { name: textLayer.name, index: textLayer.index, type: "text", inPoint: textLayer.inPoint, outPoint: textLayer.outPoint, position: textLayer.property("Position").value }
        }, null, 2);
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() }, null, 2);
    }
}

// --- createShapeLayer (from createShapeLayer.jsx) --- 
function createShapeLayer(args) {
    try {
        var compName = args.compName || "";
        var shapeType = args.shapeType || "rectangle"; 
        var position = args.position || [960, 540]; 
        var size = args.size || [200, 200]; 
        var fillColor = args.fillColor || [1, 0, 0]; 
        var strokeColor = args.strokeColor || [0, 0, 0]; 
        var strokeWidth = args.strokeWidth || 0; 
        var startTime = args.startTime || 0;
        var duration = args.duration || 5; 
        var name = args.name || "Shape Layer";
        var points = args.points || 5; 
        var comp = null;
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem && item.name === compName) { comp = item; break; }
        }
        if (!comp) {
            if (app.project.activeItem instanceof CompItem) { comp = app.project.activeItem; } 
            else { throw new Error("No composition found with name '" + compName + "' and no active composition"); }
        }
        var shapeLayer = comp.layers.addShape();
        shapeLayer.name = name;
        var contents = shapeLayer.property("Contents"); 
        var shapeGroup = contents.addProperty("ADBE Vector Group");
        var groupContents = shapeGroup.property("Contents"); 
        var shapePathProperty;
        if (shapeType === "rectangle") {
            shapePathProperty = groupContents.addProperty("ADBE Vector Shape - Rect");
            shapePathProperty.property("Size").setValue(size);
        } else if (shapeType === "ellipse") {
            shapePathProperty = groupContents.addProperty("ADBE Vector Shape - Ellipse");
            shapePathProperty.property("Size").setValue(size);
        } else if (shapeType === "polygon" || shapeType === "star") { 
            shapePathProperty = groupContents.addProperty("ADBE Vector Shape - Star");
            shapePathProperty.property("Type").setValue(shapeType === "polygon" ? 1 : 2); 
            shapePathProperty.property("Points").setValue(points);
            shapePathProperty.property("Outer Radius").setValue(size[0] / 2);
            if (shapeType === "star") { shapePathProperty.property("Inner Radius").setValue(size[0] / 3); }
        }
        var fill = groupContents.addProperty("ADBE Vector Graphic - Fill");
        fill.property("Color").setValue(fillColor);
        fill.property("Opacity").setValue(100);
        if (strokeWidth > 0) {
            var stroke = groupContents.addProperty("ADBE Vector Graphic - Stroke");
            stroke.property("Color").setValue(strokeColor);
            stroke.property("Stroke Width").setValue(strokeWidth);
            stroke.property("Opacity").setValue(100);
        }
        shapeLayer.property("Position").setValue(position);
        shapeLayer.startTime = startTime;
        if (duration > 0) { shapeLayer.outPoint = startTime + duration; }
        return JSON.stringify({
            status: "success", message: "Shape layer created successfully",
            layer: { name: shapeLayer.name, index: shapeLayer.index, type: "shape", shapeType: shapeType, inPoint: shapeLayer.inPoint, outPoint: shapeLayer.outPoint, position: shapeLayer.property("Position").value }
        }, null, 2);
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() }, null, 2);
    }
}

// --- createCamera ---
function createCamera(args) {
    try {
        var compName = args.compName || "";
        var name = args.name || "Camera";
        var zoom = args.zoom || 1777.78; // Default ~50mm equivalent
        var position = args.position; // Optional [x, y, z]
        var pointOfInterest = args.pointOfInterest; // Optional [x, y, z]
        var oneNode = args.oneNode || false; // If true, create a one-node camera (no point of interest)

        var comp = null;
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem && item.name === compName) { comp = item; break; }
        }
        if (!comp) {
            if (app.project.activeItem instanceof CompItem) { comp = app.project.activeItem; }
            else { throw new Error("No composition found with name '" + compName + "' and no active composition"); }
        }

        var centerPoint = [comp.width / 2, comp.height / 2];
        var cameraLayer = comp.layers.addCamera(name, centerPoint);
        cameraLayer.property("Camera Options").property("Zoom").setValue(zoom);

        if (oneNode) {
            cameraLayer.autoOrient = AutoOrientType.NO_AUTO_ORIENT;
        }

        if (position !== undefined && position !== null) {
            cameraLayer.property("Position").setValue(position);
        }

        if (pointOfInterest !== undefined && pointOfInterest !== null && !oneNode) {
            cameraLayer.property("Point of Interest").setValue(pointOfInterest);
        }

        var result = {
            name: cameraLayer.name,
            index: cameraLayer.index,
            zoom: cameraLayer.property("Camera Options").property("Zoom").value,
            position: cameraLayer.property("Position").value,
            oneNode: oneNode
        };
        if (!oneNode) {
            result.pointOfInterest = cameraLayer.property("Point of Interest").value;
        }

        return JSON.stringify({
            status: "success",
            message: "Camera created successfully",
            layer: result
        }, null, 2);
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() }, null, 2);
    }
}

// --- duplicateLayer ---
function duplicateLayer(args) {
    try {
        var compName = args.compName || "";
        var layerIndex = args.layerIndex;
        var layerName = args.layerName || "";
        var newName = args.newName; // optional rename

        var comp = null;
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem && item.name === compName) { comp = item; break; }
        }
        if (!comp) {
            if (app.project.activeItem instanceof CompItem) { comp = app.project.activeItem; }
            else { throw new Error("No composition found with name '" + compName + "' and no active composition"); }
        }

        var layer = null;
        if (layerIndex !== undefined && layerIndex !== null) {
            if (layerIndex > 0 && layerIndex <= comp.numLayers) { layer = comp.layer(layerIndex); }
            else { throw new Error("Layer index out of bounds: " + layerIndex); }
        } else if (layerName) {
            for (var j = 1; j <= comp.numLayers; j++) {
                if (comp.layer(j).name === layerName) { layer = comp.layer(j); break; }
            }
        }
        if (!layer) { throw new Error("Layer not found: " + (layerName || "index " + layerIndex)); }

        var newLayer = layer.duplicate();
        if (newName) { newLayer.name = newName; }

        return JSON.stringify({
            status: "success",
            message: "Layer duplicated successfully",
            original: { name: layer.name, index: layer.index },
            duplicate: { name: newLayer.name, index: newLayer.index }
        }, null, 2);
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() }, null, 2);
    }
}

// --- deleteLayer ---
function deleteLayer(args) {
    try {
        var compName = args.compName || "";
        var layerIndex = args.layerIndex;
        var layerName = args.layerName || "";

        var comp = null;
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem && item.name === compName) { comp = item; break; }
        }
        if (!comp) {
            if (app.project.activeItem instanceof CompItem) { comp = app.project.activeItem; }
            else { throw new Error("No composition found with name '" + compName + "' and no active composition"); }
        }

        var layer = null;
        if (layerIndex !== undefined && layerIndex !== null) {
            if (layerIndex > 0 && layerIndex <= comp.numLayers) { layer = comp.layer(layerIndex); }
            else { throw new Error("Layer index out of bounds: " + layerIndex); }
        } else if (layerName) {
            for (var j = 1; j <= comp.numLayers; j++) {
                if (comp.layer(j).name === layerName) { layer = comp.layer(j); break; }
            }
        }
        if (!layer) { throw new Error("Layer not found: " + (layerName || "index " + layerIndex)); }

        var deletedName = layer.name;
        var deletedIndex = layer.index;
        layer.remove();

        return JSON.stringify({
            status: "success",
            message: "Layer deleted successfully",
            deleted: { name: deletedName, index: deletedIndex }
        }, null, 2);
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() }, null, 2);
    }
}

// --- setLayerMask: create or modify a mask on a layer ---
function setLayerMask(args) {
    try {
        var compName = args.compName || "";
        var layerIndex = args.layerIndex;
        var layerName = args.layerName || "";
        var maskIndex = args.maskIndex; // optional — if provided, modify existing mask
        var maskPath = args.maskPath; // array of [x, y] points defining the mask shape
        var maskRect = args.maskRect; // shorthand: {top, left, width, height} for rectangular masks
        var maskMode = args.maskMode || "add"; // "add", "subtract", "intersect", "none"
        var maskFeather = args.maskFeather; // optional [x, y] feather
        var maskOpacity = args.maskOpacity; // optional 0-100
        var maskExpansion = args.maskExpansion; // optional pixels
        var maskName = args.maskName; // optional rename

        var comp = null;
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem && item.name === compName) { comp = item; break; }
        }
        if (!comp) {
            if (app.project.activeItem instanceof CompItem) { comp = app.project.activeItem; }
            else { throw new Error("No composition found with name '" + compName + "' and no active composition"); }
        }

        var layer = null;
        if (layerIndex !== undefined && layerIndex !== null) {
            if (layerIndex > 0 && layerIndex <= comp.numLayers) { layer = comp.layer(layerIndex); }
            else { throw new Error("Layer index out of bounds: " + layerIndex); }
        } else if (layerName) {
            for (var j = 1; j <= comp.numLayers; j++) {
                if (comp.layer(j).name === layerName) { layer = comp.layer(j); break; }
            }
        }
        if (!layer) { throw new Error("Layer not found: " + (layerName || "index " + layerIndex)); }

        // Build the mask shape
        var shapePoints = [];
        if (maskRect) {
            // Rectangle shorthand
            var t = maskRect.top || 0;
            var l = maskRect.left || 0;
            var w = maskRect.width || comp.width;
            var h = maskRect.height || comp.height;
            shapePoints = [[l, t], [l + w, t], [l + w, t + h], [l, t + h]];
        } else if (maskPath && maskPath.length >= 3) {
            shapePoints = maskPath;
        } else {
            throw new Error("Must provide either maskRect or maskPath with at least 3 points");
        }

        // Create the shape object
        var myShape = new Shape();
        var vertices = [];
        for (var p = 0; p < shapePoints.length; p++) {
            vertices.push(shapePoints[p]);
        }
        myShape.vertices = vertices;
        myShape.closed = true;

        var changed = [];
        var mask;

        if (maskIndex !== undefined && maskIndex !== null) {
            // Modify existing mask
            if (maskIndex > 0 && maskIndex <= layer.property("Masks").numProperties) {
                mask = layer.property("Masks").property(maskIndex);
            } else {
                throw new Error("Mask index out of bounds: " + maskIndex);
            }
            mask.property("Mask Path").setValue(myShape);
            changed.push("maskPath");
        } else {
            // Create new mask
            mask = layer.property("Masks").addProperty("Mask");
            mask.property("Mask Path").setValue(myShape);
            changed.push("newMask");
        }

        // Set mask mode
        var modes = {
            "none": MaskMode.NONE,
            "add": MaskMode.ADD,
            "subtract": MaskMode.SUBTRACT,
            "intersect": MaskMode.INTERSECT,
            "lighten": MaskMode.LIGHTEN,
            "darken": MaskMode.DARKEN,
            "difference": MaskMode.DIFFERENCE
        };
        if (modes[maskMode] !== undefined) {
            mask.maskMode = modes[maskMode];
            changed.push("maskMode");
        }

        if (maskFeather !== undefined && maskFeather !== null) {
            mask.property("Mask Feather").setValue(maskFeather);
            changed.push("maskFeather");
        }
        if (maskOpacity !== undefined && maskOpacity !== null) {
            mask.property("Mask Opacity").setValue(maskOpacity);
            changed.push("maskOpacity");
        }
        if (maskExpansion !== undefined && maskExpansion !== null) {
            mask.property("Mask Expansion").setValue(maskExpansion);
            changed.push("maskExpansion");
        }
        if (maskName) {
            mask.name = maskName;
            changed.push("maskName");
        }

        return JSON.stringify({
            status: "success",
            message: "Mask set successfully",
            layer: { name: layer.name, index: layer.index },
            mask: {
                name: mask.name,
                index: mask.propertyIndex,
                mode: maskMode,
                changedProperties: changed
            }
        }, null, 2);
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() }, null, 2);
    }
}

// --- createSolidLayer (from createSolidLayer.jsx) ---
function createSolidLayer(args) {
    try {
        var compName = args.compName || "";
        var color = args.color || [1, 1, 1]; 
        var name = args.name || "Solid Layer";
        var position = args.position || [960, 540]; 
        var size = args.size; 
        var startTime = args.startTime || 0;
        var duration = args.duration || 5; 
        var isAdjustment = args.isAdjustment || false; 
        var comp = null;
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem && item.name === compName) { comp = item; break; }
        }
        if (!comp) {
            if (app.project.activeItem instanceof CompItem) { comp = app.project.activeItem; } 
            else { throw new Error("No composition found with name '" + compName + "' and no active composition"); }
        }
        if (!size) { size = [comp.width, comp.height]; }
        var solidLayer;
        if (isAdjustment) {
            solidLayer = comp.layers.addSolid([0, 0, 0], name, size[0], size[1], 1);
            solidLayer.adjustmentLayer = true;
        } else {
            solidLayer = comp.layers.addSolid(color, name, size[0], size[1], 1);
        }
        solidLayer.property("Position").setValue(position);
        solidLayer.startTime = startTime;
        if (duration > 0) { solidLayer.outPoint = startTime + duration; }
        return JSON.stringify({
            status: "success", message: isAdjustment ? "Adjustment layer created successfully" : "Solid layer created successfully",
            layer: { name: solidLayer.name, index: solidLayer.index, type: isAdjustment ? "adjustment" : "solid", inPoint: solidLayer.inPoint, outPoint: solidLayer.outPoint, position: solidLayer.property("Position").value, isAdjustment: solidLayer.adjustmentLayer }
        }, null, 2);
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() }, null, 2);
    }
}

// --- setLayerProperties (modified to handle text properties) ---
function setLayerProperties(args) {
    try {
        var compName = args.compName || "";
        var layerName = args.layerName || "";
        var layerIndex = args.layerIndex; 
        
        // General Properties
        var position = args.position; 
        var scale = args.scale; 
        var rotation = args.rotation; 
        var opacity = args.opacity; 
        var startTime = args.startTime; 
        var duration = args.duration; 

        // Text Specific Properties
        var textContent = args.text; // New: text content
        var fontFamily = args.fontFamily; // New: font family
        var fontSize = args.fontSize; // New: font size
        var fillColor = args.fillColor; // New: font color
        
        // Find the composition (same logic as before)
        var comp = null;
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem && item.name === compName) { comp = item; break; }
        }
        if (!comp) {
            if (app.project.activeItem instanceof CompItem) { comp = app.project.activeItem; } 
            else { throw new Error("No composition found with name '" + compName + "' and no active composition"); }
        }
        
        // Find the layer (same logic as before)
        var layer = null;
        if (layerIndex !== undefined && layerIndex !== null) {
            if (layerIndex > 0 && layerIndex <= comp.numLayers) { layer = comp.layer(layerIndex); } 
            else { throw new Error("Layer index out of bounds: " + layerIndex); }
        } else if (layerName) {
            for (var j = 1; j <= comp.numLayers; j++) {
                if (comp.layer(j).name === layerName) { layer = comp.layer(j); break; }
            }
        }
        if (!layer) { throw new Error("Layer not found: " + (layerName || "index " + layerIndex)); }
        
        var changedProperties = [];
        var textDocumentChanged = false;
        var textProp = null;
        var textDocument = null;

        // --- Text Property Handling ---
        if (layer instanceof TextLayer && (textContent !== undefined || fontFamily !== undefined || fontSize !== undefined || fillColor !== undefined)) {
            var sourceTextProp = layer.property("Source Text");
            if (sourceTextProp && sourceTextProp.value) {
                var currentTextDocument = sourceTextProp.value; // Get the current value
                var updated = false;

                if (textContent !== undefined && textContent !== null && currentTextDocument.text !== textContent) {
                    currentTextDocument.text = textContent;
                    changedProperties.push("text");
                    updated = true;
                }
                if (fontFamily !== undefined && fontFamily !== null && currentTextDocument.font !== fontFamily) {
                    // Add basic validation/logging for font existence if needed
                    // try { app.fonts.findFont(fontFamily); } catch (e) { logToPanel("Warning: Font '"+fontFamily+"' might not be installed."); }
                    currentTextDocument.font = fontFamily;
                    changedProperties.push("fontFamily");
                    updated = true;
                }
                if (fontSize !== undefined && fontSize !== null && currentTextDocument.fontSize !== fontSize) {
                    currentTextDocument.fontSize = fontSize;
                    changedProperties.push("fontSize");
                    updated = true;
                }
                // Comparing colors needs care due to potential floating point inaccuracies if set via UI
                // Simple comparison for now
                if (fillColor !== undefined && fillColor !== null && 
                    (currentTextDocument.fillColor[0] !== fillColor[0] || 
                     currentTextDocument.fillColor[1] !== fillColor[1] || 
                     currentTextDocument.fillColor[2] !== fillColor[2])) {
                    currentTextDocument.fillColor = fillColor;
                    changedProperties.push("fillColor");
                    updated = true;
                }

                // Only set the value if something actually changed
                if (updated) {
                    try {
                        sourceTextProp.setValue(currentTextDocument);
                        logToPanel("Applied changes to Text Document for layer: " + layer.name);
                    } catch (e) {
                        logToPanel("ERROR applying Text Document changes: " + e.toString());
                        // Decide if we should throw or just log the error for text properties
                        // For now, just log, other properties might still succeed
                    }
                }
                 // Store the potentially updated document for the return value
                 textDocument = currentTextDocument; 

            } else {
                logToPanel("Warning: Could not access Source Text property for layer: " + layer.name);
            }
        }

        // --- Enabled/Visible ---
        var enabled = args.enabled;
        if (enabled !== undefined && enabled !== null) { layer.enabled = !!enabled; changedProperties.push("enabled"); }

        // --- Blend Mode ---
        var blendMode = args.blendMode;
        if (blendMode !== undefined && blendMode !== null) {
            var modes = {
                "normal": BlendingMode.NORMAL,
                "add": BlendingMode.ADD,
                "multiply": BlendingMode.MULTIPLY,
                "screen": BlendingMode.SCREEN,
                "overlay": BlendingMode.OVERLAY,
                "softLight": BlendingMode.SOFT_LIGHT,
                "hardLight": BlendingMode.HARD_LIGHT,
                "colorDodge": BlendingMode.COLOR_DODGE,
                "colorBurn": BlendingMode.COLOR_BURN,
                "darken": BlendingMode.DARKEN,
                "lighten": BlendingMode.LIGHTEN,
                "difference": BlendingMode.DIFFERENCE,
                "exclusion": BlendingMode.EXCLUSION,
                "hue": BlendingMode.HUE,
                "saturation": BlendingMode.SATURATION,
                "color": BlendingMode.COLOR,
                "luminosity": BlendingMode.LUMINOSITY
            };
            if (modes[blendMode] !== undefined) {
                layer.blendingMode = modes[blendMode];
                changedProperties.push("blendMode");
            }
        }

        // --- Track Matte ---
        var trackMatteType = args.trackMatteType;
        if (trackMatteType !== undefined && trackMatteType !== null) {
            // Values: "none", "alpha", "alphaInverted", "luma", "lumaInverted"
            var matteTypes = {
                "none": TrackMatteType.NO_TRACK_MATTE,
                "alpha": TrackMatteType.ALPHA,
                "alphaInverted": TrackMatteType.ALPHA_INVERTED,
                "luma": TrackMatteType.LUMA,
                "lumaInverted": TrackMatteType.LUMA_INVERTED
            };
            if (matteTypes[trackMatteType] !== undefined) {
                layer.trackMatteType = matteTypes[trackMatteType];
                changedProperties.push("trackMatteType");
            }
        }

        // --- General Property Handling ---
        var threeDLayer = args.threeDLayer;
        if (threeDLayer !== undefined && threeDLayer !== null) { layer.threeDLayer = !!threeDLayer; changedProperties.push("threeDLayer"); }
        if (position !== undefined && position !== null) {
            var posProp = layer.property("Position");
            if (posProp.numKeys > 0) { while (posProp.numKeys > 0) { posProp.removeKey(1); } }
            posProp.setValue(position);
            changedProperties.push("position");
        }
        if (scale !== undefined && scale !== null) { layer.property("Scale").setValue(scale); changedProperties.push("scale"); }
        if (rotation !== undefined && rotation !== null) {
            if (layer.threeDLayer) { 
                // For 3D layers, Z rotation is often what's intended by a single value
                layer.property("Z Rotation").setValue(rotation);
            } else { 
                layer.property("Rotation").setValue(rotation); 
            }
            changedProperties.push("rotation");
        }
        if (opacity !== undefined && opacity !== null) { layer.property("Opacity").setValue(opacity); changedProperties.push("opacity"); }
        if (startTime !== undefined && startTime !== null) { layer.startTime = startTime; changedProperties.push("startTime"); }
        if (duration !== undefined && duration !== null && duration > 0) {
            var actualStartTime = (startTime !== undefined && startTime !== null) ? startTime : layer.startTime;
            layer.outPoint = actualStartTime + duration;
            changedProperties.push("duration");
        }

        // Return success with updated layer details (including text if changed)
        var returnLayerInfo = {
            name: layer.name,
            index: layer.index,
            threeDLayer: layer.threeDLayer,
            position: layer.property("Position").value,
            scale: layer.property("Scale").value,
            rotation: layer.threeDLayer ? layer.property("Z Rotation").value : layer.property("Rotation").value, // Return appropriate rotation
            opacity: layer.property("Opacity").value,
            inPoint: layer.inPoint,
            outPoint: layer.outPoint,
            changedProperties: changedProperties
        };
        // Add text properties to the return object if it was a text layer
        if (layer instanceof TextLayer && textDocument) {
            returnLayerInfo.text = textDocument.text;
            returnLayerInfo.fontFamily = textDocument.font;
            returnLayerInfo.fontSize = textDocument.fontSize;
            returnLayerInfo.fillColor = textDocument.fillColor;
        }

        // *** ADDED LOGGING HERE ***
        logToPanel("Final check before return:");
        logToPanel("  Changed Properties: " + changedProperties.join(", "));
        logToPanel("  Return Layer Info Font: " + (returnLayerInfo.fontFamily || "N/A")); 
        logToPanel("  TextDocument Font: " + (textDocument ? textDocument.font : "N/A"));

        return JSON.stringify({
            status: "success", message: "Layer properties updated successfully",
            layer: returnLayerInfo
        }, null, 2);
    } catch (error) {
        // Error handling remains similar, but add more specific checks if needed
        return JSON.stringify({ status: "error", message: error.toString() }, null, 2);
    }
}

// --- batchSetLayerProperties: apply properties to multiple layers in one call ---
function batchSetLayerProperties(args) {
    try {
        var compName = args.compName || "";
        var operations = args.operations; // Array of {layerIndex, threeDLayer, position, scale, rotation, opacity, ...}

        if (!operations || !operations.length) {
            throw new Error("No operations provided. Pass an array of {layerIndex, ...properties}");
        }

        var comp = null;
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem && item.name === compName) { comp = item; break; }
        }
        if (!comp) {
            if (app.project.activeItem instanceof CompItem) { comp = app.project.activeItem; }
            else { throw new Error("No composition found with name '" + compName + "' and no active composition"); }
        }

        var results = [];
        for (var o = 0; o < operations.length; o++) {
            var op = operations[o];
            var layer = null;
            if (op.layerIndex !== undefined && op.layerIndex !== null) {
                if (op.layerIndex > 0 && op.layerIndex <= comp.numLayers) { layer = comp.layer(op.layerIndex); }
                else { results.push({ layerIndex: op.layerIndex, status: "error", message: "Layer index out of bounds" }); continue; }
            } else if (op.layerName) {
                for (var j = 1; j <= comp.numLayers; j++) {
                    if (comp.layer(j).name === op.layerName) { layer = comp.layer(j); break; }
                }
            }
            if (!layer) { results.push({ layerIndex: op.layerIndex, layerName: op.layerName, status: "error", message: "Layer not found" }); continue; }

            var changed = [];
            if (op.threeDLayer !== undefined && op.threeDLayer !== null) { layer.threeDLayer = !!op.threeDLayer; changed.push("threeDLayer"); }
            if (op.position !== undefined && op.position !== null) {
                var posProp = layer.property("Position");
                if (posProp.numKeys > 0) {
                    while (posProp.numKeys > 0) { posProp.removeKey(1); }
                }
                posProp.setValue(op.position);
                changed.push("position");
            }
            if (op.scale !== undefined && op.scale !== null) { layer.property("Scale").setValue(op.scale); changed.push("scale"); }
            if (op.rotation !== undefined && op.rotation !== null) {
                if (layer.threeDLayer) { layer.property("Z Rotation").setValue(op.rotation); }
                else { layer.property("Rotation").setValue(op.rotation); }
                changed.push("rotation");
            }
            if (op.opacity !== undefined && op.opacity !== null) { layer.property("Opacity").setValue(op.opacity); changed.push("opacity"); }
            if (op.blendMode !== undefined && op.blendMode !== null) {
                var bModes = {"normal":BlendingMode.NORMAL,"add":BlendingMode.ADD,"multiply":BlendingMode.MULTIPLY,"screen":BlendingMode.SCREEN,"overlay":BlendingMode.OVERLAY,"softLight":BlendingMode.SOFT_LIGHT,"hardLight":BlendingMode.HARD_LIGHT,"darken":BlendingMode.DARKEN,"lighten":BlendingMode.LIGHTEN,"difference":BlendingMode.DIFFERENCE};
                if (bModes[op.blendMode] !== undefined) { layer.blendingMode = bModes[op.blendMode]; changed.push("blendMode"); }
            }
            if (op.startTime !== undefined && op.startTime !== null) { layer.startTime = op.startTime; changed.push("startTime"); }
            if (op.outPoint !== undefined && op.outPoint !== null) { layer.outPoint = op.outPoint; changed.push("outPoint"); }

            results.push({
                layerIndex: layer.index,
                name: layer.name,
                status: "success",
                threeDLayer: layer.threeDLayer,
                position: layer.property("Position").value,
                changedProperties: changed
            });
        }

        return JSON.stringify({ status: "success", results: results }, null, 2);
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() }, null, 2);
    }
}

/**
 * Sets a keyframe for a specific property on a layer.
 * Indices are 1-based for After Effects collections.
 * @param {number} compIndex - The index of the composition (1-based).
 * @param {number} layerIndex - The index of the layer within the composition (1-based).
 * @param {string} propertyName - The name of the property (e.g., "Position", "Scale", "Rotation", "Opacity").
 * @param {number} timeInSeconds - The time (in seconds) for the keyframe.
 * @param {any} value - The value for the keyframe (e.g., [x, y] for Position, [w, h] for Scale, angle for Rotation, percentage for Opacity).
 * @returns {string} JSON string indicating success or error.
 */
function setLayerKeyframe(compIndex, layerIndex, propertyName, timeInSeconds, value) {
    try {
        // Use 1-based indices as per After Effects API
        var comp = app.project.items[compIndex];
        if (!comp || !(comp instanceof CompItem)) {
            return JSON.stringify({ success: false, message: "Composition not found at index " + compIndex });
        }
        var layer = comp.layers[layerIndex];
        if (!layer) {
            return JSON.stringify({ success: false, message: "Layer not found at index " + layerIndex + " in composition '" + comp.name + "'"});
        }

        var transformGroup = layer.property("Transform");
        if (!transformGroup) {
             return JSON.stringify({ success: false, message: "Transform properties not found for layer '" + layer.name + "' (type: " + layer.matchName + ")." });
        }

        var property = transformGroup.property(propertyName);
        if (!property) {
            // Check other common property groups if not in Transform
             if (layer.property("Effects") && layer.property("Effects").property(propertyName)) {
                 property = layer.property("Effects").property(propertyName);
             } else if (layer.property("Text") && layer.property("Text").property(propertyName)) {
                 property = layer.property("Text").property(propertyName);
            } // Add more groups if needed (e.g., Masks, Shapes)

            if (!property) {
                 return JSON.stringify({ success: false, message: "Property '" + propertyName + "' not found on layer '" + layer.name + "'." });
            }
        }


        // Ensure the property can be keyframed
        if (!property.canVaryOverTime) {
             return JSON.stringify({ success: false, message: "Property '" + propertyName + "' cannot be keyframed." });
        }

        // Make sure the property is enabled for keyframing
        if (property.numKeys === 0 && !property.isTimeVarying) {
             property.setValueAtTime(comp.time, property.value); // Set initial keyframe if none exist
        }


        property.setValueAtTime(timeInSeconds, value);

        return JSON.stringify({ success: true, message: "Keyframe set for '" + propertyName + "' on layer '" + layer.name + "' at " + timeInSeconds + "s." });
    } catch (e) {
        return JSON.stringify({ success: false, message: "Error setting keyframe: " + e.toString() + " (Line: " + e.line + ")" });
    }
}


/**
 * Sets an expression for a specific property on a layer.
 * @param {number} compIndex - The index of the composition (1-based).
 * @param {number} layerIndex - The index of the layer within the composition (1-based).
 * @param {string} propertyName - The name of the property (e.g., "Position", "Scale", "Rotation", "Opacity").
 * @param {string} expressionString - The JavaScript expression string. Use "" to remove expression.
 * @returns {string} JSON string indicating success or error.
 */
function setLayerExpression(compIndex, layerIndex, propertyName, expressionString) {
    try {
         // Adjust indices to be 0-based for ExtendScript arrays
        var comp = app.project.items[compIndex];
         if (!comp || !(comp instanceof CompItem)) {
            return JSON.stringify({ success: false, message: "Composition not found at index " + compIndex });
        }
        var layer = comp.layers[layerIndex];
         if (!layer) {
            return JSON.stringify({ success: false, message: "Layer not found at index " + layerIndex + " in composition '" + comp.name + "'"});
        }

        var transformGroup = layer.property("Transform");
         if (!transformGroup) {
             // Allow expressions on non-transformable layers if property exists elsewhere
             // return JSON.stringify({ success: false, message: "Transform properties not found for layer '" + layer.name + "' (type: " + layer.matchName + ")." });
        }

        var property = transformGroup ? transformGroup.property(propertyName) : null;
         if (!property) {
            // Check other common property groups if not in Transform
             if (layer.property("Effects") && layer.property("Effects").property(propertyName)) {
                 property = layer.property("Effects").property(propertyName);
             } else if (layer.property("Text") && layer.property("Text").property(propertyName)) {
                 property = layer.property("Text").property(propertyName);
             }

            // Search inside individual effects for sub-properties
            if (!property && layer.property("Effects")) {
                var effects = layer.property("Effects");
                for (var ei = 1; ei <= effects.numProperties; ei++) {
                    var eff = effects.property(ei);
                    try {
                        var subProp = eff.property(propertyName);
                        if (subProp) { property = subProp; break; }
                    } catch (e2) {}
                }
            }

            if (!property) {
                 return JSON.stringify({ success: false, message: "Property '" + propertyName + "' not found on layer '" + layer.name + "'." });
            }
        }

        if (!property.canSetExpression) {
            return JSON.stringify({ success: false, message: "Property '" + propertyName + "' does not support expressions." });
        }

        property.expression = expressionString;

        var action = expressionString === "" ? "removed" : "set";
        return JSON.stringify({ success: true, message: "Expression " + action + " for '" + propertyName + "' on layer '" + layer.name + "'." });
    } catch (e) {
        return JSON.stringify({ success: false, message: "Error setting expression: " + e.toString() + " (Line: " + e.line + ")" });
    }
}

// --- applyEffect (from applyEffect.jsx) ---
function applyEffect(args) {
    try {
        // Extract parameters
        var compIndex = args.compIndex || 1; // Default to first comp
        var layerIndex = args.layerIndex || 1; // Default to first layer
        var effectName = args.effectName; // Name of the effect to apply
        var effectMatchName = args.effectMatchName; // After Effects internal name (more reliable)
        var effectCategory = args.effectCategory || ""; // Optional category for filtering
        var presetPath = args.presetPath; // Optional path to an effect preset
        var effectSettings = args.effectSettings || {}; // Optional effect parameters
        
        if (!effectName && !effectMatchName && !presetPath) {
            throw new Error("You must specify either effectName, effectMatchName, or presetPath");
        }
        
        // Find the composition by index
        var comp = app.project.item(compIndex);
        if (!comp || !(comp instanceof CompItem)) {
            throw new Error("Composition not found at index " + compIndex);
        }
        
        // Find the layer by index
        var layer = comp.layer(layerIndex);
        if (!layer) {
            throw new Error("Layer not found at index " + layerIndex + " in composition '" + comp.name + "'");
        }
        
        var effectResult;
        
        // Apply preset if a path is provided
        if (presetPath) {
            var presetFile = new File(presetPath);
            if (!presetFile.exists) {
                throw new Error("Effect preset file not found: " + presetPath);
            }
            
            // Apply the preset to the layer
            layer.applyPreset(presetFile);
            effectResult = {
                type: "preset",
                name: presetPath.split('/').pop().split('\\').pop(),
                applied: true
            };
        }
        // Apply effect by match name (more reliable method)
        else if (effectMatchName) {
            var effect = layer.Effects.addProperty(effectMatchName);
            effectResult = {
                type: "effect",
                name: effect.name,
                matchName: effect.matchName,
                index: effect.propertyIndex
            };
            
            // Apply settings if provided
            applyEffectSettings(effect, effectSettings);
        }
        // Apply effect by display name
        else {
            // Get the effect from the Effect menu
            var effect = layer.Effects.addProperty(effectName);
            effectResult = {
                type: "effect",
                name: effect.name,
                matchName: effect.matchName,
                index: effect.propertyIndex
            };
            
            // Apply settings if provided
            applyEffectSettings(effect, effectSettings);
        }
        
        return JSON.stringify({
            status: "success",
            message: "Effect applied successfully",
            effect: effectResult,
            layer: {
                name: layer.name,
                index: layerIndex
            },
            composition: {
                name: comp.name,
                index: compIndex
            }
        }, null, 2);
    } catch (error) {
        return JSON.stringify({
            status: "error",
            message: error.toString()
        }, null, 2);
    }
}

// Helper function to apply effect settings
function applyEffectSettings(effect, settings) {
    // Skip if no settings are provided
    if (!settings) return;
    var hasKeys = false;
    for (var k in settings) { if (settings.hasOwnProperty(k)) { hasKeys = true; break; } }
    if (!hasKeys) return;
    
    // Iterate through all provided settings
    for (var propName in settings) {
        if (settings.hasOwnProperty(propName)) {
            try {
                // Find the property in the effect
                var property = null;
                
                // Try direct property access first
                try {
                    property = effect.property(propName);
                } catch (e) {
                    // If direct access fails, search through all properties
                    for (var i = 1; i <= effect.numProperties; i++) {
                        var prop = effect.property(i);
                        if (prop.name === propName) {
                            property = prop;
                            break;
                        }
                    }
                }
                
                // Set the property value if found
                if (property && property.setValue) {
                    property.setValue(settings[propName]);
                }
            } catch (e) {
                // Log error but continue with other properties
                $.writeln("Error setting effect property '" + propName + "': " + e.toString());
            }
        }
    }
}

// --- applyEffectTemplate (from applyEffectTemplate.jsx) ---
function applyEffectTemplate(args) {
    try {
        // Extract parameters
        var compIndex = args.compIndex || 1; // Default to first comp
        var layerIndex = args.layerIndex || 1; // Default to first layer
        var templateName = args.templateName; // Name of the template to apply
        var customSettings = args.customSettings || {}; // Optional customizations
        
        if (!templateName) {
            throw new Error("You must specify a templateName");
        }
        
        // Find the composition by index
        var comp = app.project.item(compIndex);
        if (!comp || !(comp instanceof CompItem)) {
            throw new Error("Composition not found at index " + compIndex);
        }
        
        // Find the layer by index
        var layer = comp.layer(layerIndex);
        if (!layer) {
            throw new Error("Layer not found at index " + layerIndex + " in composition '" + comp.name + "'");
        }
        
        // Template definitions
        var templates = {
            // Blur effects
            "gaussian-blur": {
                effectMatchName: "ADBE Gaussian Blur 2",
                settings: {
                    "Blurriness": customSettings.blurriness || 20
                }
            },
            "directional-blur": {
                effectMatchName: "ADBE Directional Blur",
                settings: {
                    "Direction": customSettings.direction || 0,
                    "Blur Length": customSettings.length || 10
                }
            },
            
            // Color correction effects
            "color-balance": {
                effectMatchName: "ADBE Color Balance (HLS)",
                settings: {
                    "Hue": customSettings.hue || 0,
                    "Lightness": customSettings.lightness || 0,
                    "Saturation": customSettings.saturation || 0
                }
            },
            "brightness-contrast": {
                effectMatchName: "ADBE Brightness & Contrast 2",
                settings: {
                    "Brightness": customSettings.brightness || 0,
                    "Contrast": customSettings.contrast || 0,
                    "Use Legacy": false
                }
            },
            "curves": {
                effectMatchName: "ADBE CurvesCustom",
                // Curves are complex and would need special handling
            },
            
            // Stylistic effects
            "glow": {
                effectMatchName: "ADBE Glow",
                settings: {
                    "Glow Threshold": customSettings.threshold || 50,
                    "Glow Radius": customSettings.radius || 15,
                    "Glow Intensity": customSettings.intensity || 1
                }
            },
            "drop-shadow": {
                effectMatchName: "ADBE Drop Shadow",
                settings: {
                    "Shadow Color": customSettings.color || [0, 0, 0, 1],
                    "Opacity": customSettings.opacity || 50,
                    "Direction": customSettings.direction || 135,
                    "Distance": customSettings.distance || 10,
                    "Softness": customSettings.softness || 10
                }
            },
            
            // Common effect chains
            "cinematic-look": {
                effects: [
                    {
                        effectMatchName: "ADBE CurvesCustom",
                        settings: {}
                    },
                    {
                        effectMatchName: "ADBE Vibrance",
                        settings: {
                            "Vibrance": 15,
                            "Saturation": -5
                        }
                    }
                ]
            },
            "text-pop": {
                effects: [
                    {
                        effectMatchName: "ADBE Drop Shadow",
                        settings: {
                            "Shadow Color": [0, 0, 0, 1],
                            "Opacity": 75,
                            "Distance": 5,
                            "Softness": 10
                        }
                    },
                    {
                        effectMatchName: "ADBE Glow",
                        settings: {
                            "Glow Threshold": 50,
                            "Glow Radius": 10,
                            "Glow Intensity": 1.5
                        }
                    }
                ]
            }
        };
        
        // Check if the requested template exists
        var template = templates[templateName];
        if (!template) {
            var availableTemplates = Object.keys(templates).join(", ");
            throw new Error("Template '" + templateName + "' not found. Available templates: " + availableTemplates);
        }
        
        var appliedEffects = [];
        
        // Apply single effect or multiple effects based on template structure
        if (template.effectMatchName) {
            // Single effect template
            var effect = layer.Effects.addProperty(template.effectMatchName);
            
            // Apply settings
            for (var propName in template.settings) {
                try {
                    var property = effect.property(propName);
                    if (property) {
                        property.setValue(template.settings[propName]);
                    }
                } catch (e) {
                    $.writeln("Warning: Could not set " + propName + " on effect " + effect.name + ": " + e);
                }
            }
            
            appliedEffects.push({
                name: effect.name,
                matchName: effect.matchName
            });
        } else if (template.effects) {
            // Multiple effects template
            for (var i = 0; i < template.effects.length; i++) {
                var effectData = template.effects[i];
                var effect = layer.Effects.addProperty(effectData.effectMatchName);
                
                // Apply settings
                for (var propName in effectData.settings) {
                    try {
                        var property = effect.property(propName);
                        if (property) {
                            property.setValue(effectData.settings[propName]);
                        }
                    } catch (e) {
                        $.writeln("Warning: Could not set " + propName + " on effect " + effect.name + ": " + e);
                    }
                }
                
                appliedEffects.push({
                    name: effect.name,
                    matchName: effect.matchName
                });
            }
        }
        
        return JSON.stringify({
            status: "success",
            message: "Effect template '" + templateName + "' applied successfully",
            appliedEffects: appliedEffects,
            layer: {
                name: layer.name,
                index: layerIndex
            },
            composition: {
                name: comp.name,
                index: compIndex
            }
        }, null, 2);
    } catch (error) {
        return JSON.stringify({
            status: "error",
            message: error.toString()
        }, null, 2);
    }
}

// --- End of Function Definitions ---

// --- Bridge test function to verify communication and effects application ---
function bridgeTestEffects(args) {
    try {
        var compIndex = (args && args.compIndex) ? args.compIndex : 1;
        var layerIndex = (args && args.layerIndex) ? args.layerIndex : 1;

        // Apply a light Gaussian Blur
        var blurRes = JSON.parse(applyEffect({
            compIndex: compIndex,
            layerIndex: layerIndex,
            effectMatchName: "ADBE Gaussian Blur 2",
            effectSettings: { "Blurriness": 5 }
        }));

        // Apply a simple drop shadow via template
        var shadowRes = JSON.parse(applyEffectTemplate({
            compIndex: compIndex,
            layerIndex: layerIndex,
            templateName: "drop-shadow"
        }));

        return JSON.stringify({
            status: "success",
            message: "Bridge test effects applied.",
            results: [blurRes, shadowRes]
        }, null, 2);
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

// JSON polyfill for ExtendScript (when JSON is undefined)
if (typeof JSON === "undefined") {
    JSON = {};
}
if (typeof JSON.parse !== "function") {
    JSON.parse = function (text) {
        // Safe-ish fallback for trusted input (our own command file)
        return eval("(" + text + ")");
    };
}
if (typeof JSON.stringify !== "function") {
    (function () {
        function esc(str) {
            return (str + "")
                .replace(/\\/g, "\\\\")
                .replace(/"/g, '\\"')
                .replace(/\n/g, "\\n")
                .replace(/\r/g, "\\r")
                .replace(/\t/g, "\\t");
        }
        function toJSON(val) {
            if (val === null) return "null";
            var t = typeof val;
            if (t === "number" || t === "boolean") return String(val);
            if (t === "string") return '"' + esc(val) + '"';
            if (val instanceof Array) {
                var a = [];
                for (var i = 0; i < val.length; i++) a.push(toJSON(val[i]));
                return "[" + a.join(",") + "]";
            }
            if (t === "object") {
                var props = [];
                for (var k in val) {
                    if (val.hasOwnProperty(k) && typeof val[k] !== "function" && typeof val[k] !== "undefined") {
                        props.push('"' + esc(k) + '":' + toJSON(val[k]));
                    }
                }
                return "{" + props.join(",") + "}";
            }
            return "null";
        }
        JSON.stringify = function (value, _replacer, _space) {
            return toJSON(value);
        };
    })();
}

// ===== MCP V2 BEGIN =====
// Queue-based command layer (v2). Each request is its own file:
//   <bridge>/queue/cmd_<id>.json  ->  <bridge>/results/res_<id>.json
// so results can never be mixed up between commands. Handlers return plain
// objects; the dispatcher wraps them in {ok, result} / {ok:false, error}.

var V2_VERSION = "2.0.0";
var V2 = {};
var v2InBatch = false;
var v2AllowRaw = false;
try {
    if (app.settings.haveSetting("aeMcpBridge", "allowRaw")) {
        v2AllowRaw = app.settings.getSetting("aeMcpBridge", "allowRaw") === "1";
    }
} catch (eAllow) { }

function v2BridgeDir() {
    var f = new Folder(Folder.myDocuments.fsName + "/ae-mcp-bridge");
    if (!f.exists) { f.create(); }
    return f;
}
function v2SubDir(name) {
    var f = new Folder(v2BridgeDir().fsName + "/" + name);
    if (!f.exists) { f.create(); }
    return f;
}

function v2Fail(msg) { throw new Error(msg); }

function v2ReadText(file) {
    file.encoding = "UTF-8";
    if (!file.open("r")) { return null; }
    var s = file.read();
    file.close();
    return s;
}
function v2WriteText(file, text) {
    file.encoding = "UTF-8";
    if (!file.open("w")) { v2Fail("Cannot write " + file.fsName); }
    file.write(text);
    file.close();
}

// ---------- resolvers ----------

// comp: undefined -> active comp; string -> name; number -> project item index;
// {id: n} -> item id; {name: s}
function v2Comp(ref) {
    var i, it;
    if (ref === undefined || ref === null || ref === "") {
        if (app.project.activeItem instanceof CompItem) { return app.project.activeItem; }
        v2Fail("No comp given and no active composition");
    }
    if (typeof ref === "number") {
        it = app.project.item(ref);
        if (it instanceof CompItem) { return it; }
        v2Fail("Project item " + ref + " is not a composition");
    }
    if (typeof ref === "object" && ref.id !== undefined) {
        for (i = 1; i <= app.project.numItems; i++) {
            it = app.project.item(i);
            if (it.id === ref.id && it instanceof CompItem) { return it; }
        }
        v2Fail("No composition with id " + ref.id);
    }
    var name = typeof ref === "object" ? ref.name : String(ref);
    for (i = 1; i <= app.project.numItems; i++) {
        it = app.project.item(i);
        if (it instanceof CompItem && it.name === name) { return it; }
    }
    v2Fail("Composition not found: " + name);
}

function v2Item(ref) {
    var i, it;
    if (typeof ref === "number") { return app.project.item(ref); }
    if (typeof ref === "object" && ref !== null && ref.id !== undefined) {
        for (i = 1; i <= app.project.numItems; i++) {
            it = app.project.item(i);
            if (it.id === ref.id) { return it; }
        }
        v2Fail("No project item with id " + ref.id);
    }
    var name = typeof ref === "object" && ref !== null ? ref.name : String(ref);
    for (i = 1; i <= app.project.numItems; i++) {
        it = app.project.item(i);
        if (it.name === name) { return it; }
    }
    v2Fail("Project item not found: " + name);
}

// layer: number -> index; string -> name; {id: n} -> layer id; {name: s}
function v2Layer(comp, ref) {
    var i;
    if (ref === undefined || ref === null) { v2Fail("Layer reference required"); }
    if (typeof ref === "number") {
        if (ref < 1 || ref > comp.numLayers) { v2Fail("Layer index out of range: " + ref); }
        return comp.layer(ref);
    }
    if (typeof ref === "object" && ref.id !== undefined) {
        for (i = 1; i <= comp.numLayers; i++) {
            if (comp.layer(i).id === ref.id) { return comp.layer(i); }
        }
        v2Fail("No layer with id " + ref.id);
    }
    var name = typeof ref === "object" ? ref.name : String(ref);
    for (i = 1; i <= comp.numLayers; i++) {
        if (comp.layer(i).name === name) { return comp.layer(i); }
    }
    v2Fail("Layer not found: " + name);
}

// path: "Effects/Wave Warp/Wave Height" or ["Effects", "Wave Warp", 3].
// Segments may be display names, match names or 1-based indices.
function v2Path(path) {
    if (path === undefined || path === null) { return []; }
    if (typeof path === "string") { return path.split("/"); }
    return path;
}
function v2Prop(root, path) {
    var segs = v2Path(path), p = root;
    for (var i = 0; i < segs.length; i++) {
        var s = segs[i], next = null;
        try { next = p.property(typeof s === "number" ? s : String(s)); } catch (e) { next = null; }
        if (!next) {
            v2Fail("Property not found: '" + s + "' under '" + (p.name || "?") + "' (path " + segs.join("/") + ")");
        }
        p = next;
    }
    return p;
}

// ---------- value conversion ----------

function v2Color(c) {
    if (typeof c === "string") {
        var h = c.replace("#", "");
        return [parseInt(h.substr(0, 2), 16) / 255, parseInt(h.substr(2, 2), 16) / 255, parseInt(h.substr(4, 2), 16) / 255];
    }
    return c;
}

function v2ToShape(v) {
    var s = new Shape();
    var n = v.vertices.length, zeros = [];
    for (var i = 0; i < n; i++) { zeros.push([0, 0]); }
    s.vertices = v.vertices;
    s.inTangents = v.inTangents || zeros;
    s.outTangents = v.outTangents || zeros;
    s.closed = v.closed !== false;
    return s;
}

// JSON -> AE value, using the target property to disambiguate.
function v2In(prop, v, comp) {
    if (v === null || v === undefined) { return v; }
    var t = prop.propertyValueType;
    if (t === PropertyValueType.SHAPE && typeof v === "object" && v.vertices) { return v2ToShape(v); }
    if (t === PropertyValueType.LAYER_INDEX) {
        if (typeof v === "object" && v.layer !== undefined) { return v2Layer(comp, v.layer).index; }
        return v;
    }
    if (t === PropertyValueType.COLOR) {
        var c = v2Color(v);
        return c.length === 3 ? [c[0], c[1], c[2], 1] : c;
    }
    if (t === PropertyValueType.TEXT_DOCUMENT && typeof v === "object") {
        var doc = prop.value;
        for (var k in v) {
            if (v.hasOwnProperty(k)) { doc[k] = (k === "fillColor" || k === "strokeColor") ? v2Color(v[k]) : v[k]; }
        }
        return doc;
    }
    return v;
}

// AE value -> JSON-safe value.
function v2Out(v) {
    if (v === null || v === undefined) { return null; }
    if (v instanceof Shape) {
        return { vertices: v.vertices, inTangents: v.inTangents, outTangents: v.outTangents, closed: v.closed };
    }
    if (v instanceof TextDocument) {
        var o = { text: v.text };
        try { o.font = v.font; o.fontSize = v.fontSize; o.fillColor = v.fillColor; o.justification = String(v.justification); o.tracking = v.tracking; } catch (e) { }
        return o;
    }
    if (typeof v === "number" || typeof v === "string" || typeof v === "boolean") { return v; }
    if (v instanceof Array) { return v; }
    return String(v);
}

function v2Layer2Comp(layer) { return layer.containingComp; }

// ---------- layer & comp settings ----------

function v2EnumName(s) {
    // "softLight" / "soft-light" / "SOFT_LIGHT" -> "SOFT_LIGHT"
    return String(s).replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/[\- ]/g, "_").toUpperCase();
}

var V2_AUTO_ORIENT = { off: "NO_AUTO_ORIENT", none: "NO_AUTO_ORIENT", path: "ALONG_PATH", camera: "CAMERA_OR_POINT_OF_INTEREST", characters: "CHARACTERS_TOWARD_CAMERA" };
var V2_TRANSFORM = {
    anchorPoint: "ADBE Anchor Point", position: "ADBE Position", scale: "ADBE Scale", opacity: "ADBE Opacity",
    rotation: "ADBE Rotate Z", zRotation: "ADBE Rotate Z", xRotation: "ADBE Rotate X", yRotation: "ADBE Rotate Y",
    orientation: "ADBE Orientation", pointOfInterest: "ADBE Anchor Point"
};

function v2ApplyLayerSettings(layer, a, warnings) {
    var comp = layer.containingComp;
    if (a.name !== undefined) { layer.name = a.name; }
    if (a.enabled !== undefined) { layer.enabled = !!a.enabled; }
    if (a.solo !== undefined) { layer.solo = !!a.solo; }
    if (a.shy !== undefined) { layer.shy = !!a.shy; }
    if (a.locked !== undefined) { layer.locked = !!a.locked; }
    if (a.label !== undefined) { layer.label = a.label; }
    if (a.comment !== undefined) { layer.comment = a.comment; }
    if (a.threeD !== undefined) { layer.threeDLayer = !!a.threeD; }
    if (a.autoOrient !== undefined) {
        var ao = V2_AUTO_ORIENT[a.autoOrient];
        if (!ao) { v2Fail("autoOrient must be off|path|camera|characters"); }
        layer.autoOrient = AutoOrientType[ao];
    }
    if (a.motionBlur !== undefined) { layer.motionBlur = !!a.motionBlur; }
    if (a.collapse !== undefined) { layer.collapseTransformation = !!a.collapse; }
    if (a.effectsActive !== undefined) { layer.effectsActive = !!a.effectsActive; }
    if (a.adjustment !== undefined) { layer.adjustmentLayer = !!a.adjustment; }
    if (a.guide !== undefined) { layer.guideLayer = !!a.guide; }
    if (a.quality !== undefined) { layer.quality = LayerQuality[v2EnumName(a.quality)]; }
    if (a.blendMode !== undefined) {
        var bm = BlendingMode[v2EnumName(a.blendMode)];
        if (bm === undefined) { v2Fail("Unknown blendMode: " + a.blendMode); }
        layer.blendingMode = bm;
    }
    if (a.parent !== undefined) {
        layer.parent = a.parent === null ? null : v2Layer(comp, a.parent);
    }
    if (a.trackMatte !== undefined) {
        var tm = a.trackMatte;
        var tmType = TrackMatteType[tm.type === "none" ? "NO_TRACK_MATTE" : v2EnumName(tm.type || "alpha")];
        if (tm.layer !== undefined && typeof layer.setTrackMatte === "function") {
            layer.setTrackMatte(v2Layer(comp, tm.layer), tmType);
        } else {
            layer.trackMatteType = tmType;
            if (tm.layer !== undefined) { warnings.push("setTrackMatte unavailable (AE < 23); used the layer above as matte"); }
        }
    }
    if (a.startTime !== undefined) { layer.startTime = a.startTime; }
    if (a.stretch !== undefined) { layer.stretch = a.stretch; }
    if (a.inPoint !== undefined) { layer.inPoint = a.inPoint; }
    if (a.outPoint !== undefined) { layer.outPoint = a.outPoint; }
    if (a.timeRemap !== undefined) { layer.timeRemapEnabled = !!a.timeRemap; }
    if (a.transform) {
        var tg = layer.property("ADBE Transform Group");
        for (var k in a.transform) {
            if (!a.transform.hasOwnProperty(k)) { continue; }
            var mn = V2_TRANSFORM[k];
            if (!mn) { v2Fail("Unknown transform key: " + k); }
            var p = tg.property(mn);
            if (!p) { warnings.push("Layer has no " + k); continue; }
            if (p.numKeys > 0) {
                if (a.clearKeys) { while (p.numKeys > 0) { p.removeKey(1); } }
                else { warnings.push(k + " has keyframes; set clearKeys:true to overwrite (value not set)"); continue; }
            }
            p.setValue(a.transform[k]);
        }
    }
    if (a.moveTo !== undefined) {
        var m = a.moveTo;
        if (m === "top") { layer.moveToBeginning(); }
        else if (m === "bottom") { layer.moveToEnd(); }
        else if (m.before !== undefined) { layer.moveBefore(v2Layer(comp, m.before)); }
        else if (m.after !== undefined) { layer.moveAfter(v2Layer(comp, m.after)); }
    }
}

function v2LayerInfo(layer) {
    var o = { index: layer.index, id: layer.id, name: layer.name, type: v2LayerType(layer) };
    try { o.threeD = layer.threeDLayer; } catch (e) { }
    try { o.parent = layer.parent ? layer.parent.index : null; } catch (e2) { }
    o.inPoint = layer.inPoint; o.outPoint = layer.outPoint; o.enabled = layer.enabled;
    return o;
}

function v2LayerType(l) {
    if (l instanceof CameraLayer) { return "camera"; }
    if (l instanceof LightLayer) { return "light"; }
    if (l instanceof ShapeLayer) { return "shape"; }
    if (l instanceof TextLayer) { return "text"; }
    if (l.nullLayer) { return "null"; }
    if (l.adjustmentLayer) { return "adjustment"; }
    try {
        if (l.source instanceof CompItem) { return "precomp"; }
        if (l.source && l.source.mainSource instanceof SolidSource) { return "solid"; }
        if (l.source) { return "footage"; }
    } catch (e) { }
    return "layer";
}

function v2CompInfo(c) {
    return { id: c.id, name: c.name, width: c.width, height: c.height, duration: c.duration, frameRate: c.frameRate, numLayers: c.numLayers };
}

function v2ApplyCompSettings(c, a, warnings) {
    if (a.name !== undefined) { c.name = a.name; }
    if (a.width !== undefined) { c.width = a.width; }
    if (a.height !== undefined) { c.height = a.height; }
    if (a.pixelAspect !== undefined) { c.pixelAspect = a.pixelAspect; }
    if (a.duration !== undefined) { c.duration = a.duration; }
    if (a.frameRate !== undefined) { c.frameRate = a.frameRate; }
    if (a.bgColor !== undefined) { c.bgColor = v2Color(a.bgColor); }
    if (a.workAreaStart !== undefined) { c.workAreaStart = a.workAreaStart; }
    if (a.workAreaDuration !== undefined) { c.workAreaDuration = a.workAreaDuration; }
    if (a.motionBlur !== undefined) { c.motionBlur = !!a.motionBlur; }
    if (a.shutterAngle !== undefined) { c.shutterAngle = a.shutterAngle; }
    if (a.shutterPhase !== undefined) { c.shutterPhase = a.shutterPhase; }
    if (a.motionBlurSamplesPerFrame !== undefined) { c.motionBlurSamplesPerFrame = a.motionBlurSamplesPerFrame; }
    if (a.motionBlurAdaptiveSampleLimit !== undefined) { c.motionBlurAdaptiveSampleLimit = a.motionBlurAdaptiveSampleLimit; }
    if (a.frameBlending !== undefined) { c.frameBlending = !!a.frameBlending; }
    if (a.draft3d !== undefined) { c.draft3d = !!a.draft3d; }
    if (a.hideShyLayers !== undefined) { c.hideShyLayers = !!a.hideShyLayers; }
    if (a.resolutionFactor !== undefined) { c.resolutionFactor = a.resolutionFactor; }
    if (a.renderer !== undefined) {
        var r = { classic: "ADBE Advanced 3d", cinema4d: "ADBE Ernst", advanced: "ADBE Calder" }[a.renderer] || a.renderer;
        var ok = false;
        try { for (var i = 0; i < c.renderers.length; i++) { if (c.renderers[i] === r) { ok = true; } } } catch (e) { ok = true; }
        if (ok) { c.renderer = r; } else { warnings.push("Renderer not available: " + r + " (have: " + c.renderers.join(", ") + ")"); }
    }
    if (a.time !== undefined) { c.time = a.time; }
    if (a.openInViewer) { c.openInViewer(); }
}

// ---------- keyframes ----------

function v2EaseDims(prop) {
    var t = prop.propertyValueType;
    if (t === PropertyValueType.TwoD_SPATIAL || t === PropertyValueType.ThreeD_SPATIAL) { return 1; }
    if (t === PropertyValueType.TwoD) { return 2; }
    if (t === PropertyValueType.ThreeD) { return 3; }
    return 1;
}
function v2Ease(prop, pair) {
    var e = [];
    for (var d = 0; d < v2EaseDims(prop); d++) { e.push(new KeyframeEase(pair[0], pair[1])); }
    return e;
}
var V2_INTERP = { linear: "LINEAR", bezier: "BEZIER", hold: "HOLD" };

// ---------- shape building ----------

function v2SetFirst(group, names, value, warnings) {
    for (var i = 0; i < names.length; i++) {
        try {
            var p = group.property(names[i]);
            if (p) { p.setValue(value); return true; }
        } catch (e) { }
    }
    warnings.push("Could not set " + names.join("|"));
    return false;
}

var V2_SHAPE_ITEMS = {
    rect: { mn: "ADBE Vector Shape - Rect", props: { size: ["ADBE Vector Rect Size", "Size"], position: ["ADBE Vector Rect Position", "Position"], roundness: ["ADBE Vector Rect Roundness", "Roundness"] } },
    ellipse: { mn: "ADBE Vector Shape - Ellipse", props: { size: ["ADBE Vector Ellipse Size", "Size"], position: ["ADBE Vector Ellipse Position", "Position"] } },
    star: { mn: "ADBE Vector Shape - Star", props: { starType: ["ADBE Vector Star Type", "Type"], points: ["ADBE Vector Star Points", "Points"], position: ["ADBE Vector Star Position", "Position"], rotation: ["ADBE Vector Star Rotation", "Rotation"], innerRadius: ["ADBE Vector Star Inner Radius", "Inner Radius"], outerRadius: ["ADBE Vector Star Outer Radius", "Outer Radius"], innerRoundness: ["ADBE Vector Star Inner Roundess", "Inner Roundness"], outerRoundness: ["ADBE Vector Star Outer Roundess", "Outer Roundness"] } },
    fill: { mn: "ADBE Vector Graphic - Fill", props: { color: ["ADBE Vector Fill Color", "Color"], opacity: ["ADBE Vector Fill Opacity", "Opacity"], rule: ["ADBE Vector Fill Rule", "Fill Rule"] } },
    stroke: { mn: "ADBE Vector Graphic - Stroke", props: { color: ["ADBE Vector Stroke Color", "Color"], width: ["ADBE Vector Stroke Width", "Stroke Width"], opacity: ["ADBE Vector Stroke Opacity", "Opacity"], lineCap: ["ADBE Vector Stroke Line Cap", "Line Cap"], lineJoin: ["ADBE Vector Stroke Line Join", "Line Join"] } },
    gradientFill: { mn: "ADBE Vector Graphic - G-Fill", props: { gradientType: ["ADBE Vector Grad Type", "Type"], start: ["ADBE Vector Grad Start Pt", "Start Point"], end: ["ADBE Vector Grad End Pt", "End Point"], opacity: ["ADBE Vector Fill Opacity", "Opacity"] } },
    trim: { mn: "ADBE Vector Filter - Trim", props: { start: ["ADBE Vector Trim Start", "Start"], end: ["ADBE Vector Trim End", "End"], offset: ["ADBE Vector Trim Offset", "Offset"] } },
    repeater: { mn: "ADBE Vector Filter - Repeater", props: { copies: ["ADBE Vector Repeater Copies", "Copies"], offset: ["ADBE Vector Repeater Offset", "Offset"] } },
    offset: { mn: "ADBE Vector Filter - Offset", props: { amount: ["ADBE Vector Offset Amount", "Amount"] } },
    roundCorners: { mn: "ADBE Vector Filter - RC", props: { radius: ["ADBE Vector RoundCorner Radius", "Radius"] } },
    wigglePaths: { mn: "ADBE Vector Filter - Roughen", props: { size: ["ADBE Vector Roughen Size", "Size"], detail: ["ADBE Vector Roughen Detail", "Detail"] } },
    zigzag: { mn: "ADBE Vector Filter - Zigzag", props: { size: ["ADBE Vector Zigzag Size", "Size"], ridges: ["ADBE Vector Zigzag Detail", "Ridges per segment"] } },
    puckerBloat: { mn: "ADBE Vector Filter - PB", props: { amount: ["ADBE Vector PuckerBloat Amount", "Amount"] } },
    twist: { mn: "ADBE Vector Filter - Twist", props: { angle: ["ADBE Vector Twist Angle", "Angle"] } },
    merge: { mn: "ADBE Vector Filter - Merge", props: { mode: ["ADBE Vector Merge Type", "Mode"] } }
};
var V2_GROUP_TRANSFORM = { anchor: ["ADBE Vector Anchor", "Anchor Point"], position: ["ADBE Vector Position", "Position"], scale: ["ADBE Vector Scale", "Scale"], rotation: ["ADBE Vector Rotation", "Rotation"], opacity: ["ADBE Vector Group Opacity", "Opacity"], skew: ["ADBE Vector Skew", "Skew"], skewAxis: ["ADBE Vector Skew Axis", "Skew Axis"] };
var V2_REPEATER_TRANSFORM = { anchor: ["ADBE Vector Repeater Anchor", "Anchor Point"], position: ["ADBE Vector Repeater Position", "Position"], scale: ["ADBE Vector Repeater Scale", "Scale"], rotation: ["ADBE Vector Repeater Rotation", "Rotation"], startOpacity: ["ADBE Vector Repeater Opacity 1", "Start Opacity"], endOpacity: ["ADBE Vector Repeater Opacity 2", "End Opacity"] };

function v2SetMap(group, map, values, warnings) {
    for (var k in values) {
        if (!values.hasOwnProperty(k) || !map[k]) { continue; }
        var v = values[k];
        if (k === "color") { v = v2Color(v); v = v.length === 3 ? [v[0], v[1], v[2], 1] : v; }
        v2SetFirst(group, map[k], v, warnings);
    }
}

function v2BuildShapeContents(contents, items, warnings) {
    for (var i = 0; i < items.length; i++) {
        var it = items[i], prop;
        if (it.type === "group") {
            prop = contents.addProperty("ADBE Vector Group");
            if (it.name) { prop.name = it.name; }
            v2BuildShapeContents(prop.property("ADBE Vectors Group"), it.contents || [], warnings);
            if (it.transform) { v2SetMap(prop.property("ADBE Vector Transform Group"), V2_GROUP_TRANSFORM, it.transform, warnings); }
            if (it.blendMode !== undefined) { try { prop.property("ADBE Vector Blend Mode").setValue(it.blendMode); } catch (eb) { warnings.push("group blendMode"); } }
        } else if (it.type === "path") {
            prop = contents.addProperty("ADBE Vector Shape - Group");
            prop.property("ADBE Vector Shape").setValue(v2ToShape(it));
            if (it.name) { prop.name = it.name; }
        } else {
            var def = V2_SHAPE_ITEMS[it.type === "polygon" ? "star" : it.type];
            if (!def) { v2Fail("Unknown shape item type: " + it.type); }
            prop = contents.addProperty(def.mn);
            if (it.name) { prop.name = it.name; }
            if (it.type === "polygon") { it.starType = 2; } else if (it.type === "star" && it.starType === undefined) { it.starType = 1; }
            v2SetMap(prop, def.props, it, warnings);
            if (it.type === "repeater" && it.transform) {
                v2SetMap(prop.property("ADBE Vector Repeater Transform"), V2_REPEATER_TRANSFORM, it.transform, warnings);
            }
        }
    }
}

// ---------- property tree dump ----------

function v2Dump(p, depth, out, budget) {
    if (budget.n <= 0) { return null; }
    budget.n--;
    var o = { name: p.name, matchName: p.matchName };
    try { o.index = p.propertyIndex; } catch (e0) { }
    if (p.propertyType === PropertyType.PROPERTY) {
        o.kind = "prop";
        try { if (p.propertyValueType !== PropertyValueType.NO_VALUE) { o.value = v2Out(p.value); } } catch (e1) { }
        try { o.numKeys = p.numKeys; } catch (e2) { }
        try { if (p.expression) { o.expression = p.expression; o.expressionError = p.expressionError; } } catch (e3) { }
        try { if (p.isDropdownEffect || (p.propertyParameters && p.propertyParameters.length)) { o.options = p.propertyParameters; } } catch (e4) { }
        try { o.valueType = String(p.propertyValueType); } catch (e5) { }
    } else {
        o.kind = "group";
        o.numProperties = p.numProperties;
        if (depth > 0) {
            o.children = [];
            for (var i = 1; i <= p.numProperties; i++) {
                var c = v2Dump(p.property(i), depth - 1, out, budget);
                if (c) { o.children.push(c); }
            }
        }
    }
    return o;
}

// ---------- handlers ----------

V2.ping = function () {
    var r = {
        bridge: V2_VERSION, aeVersion: app.version, build: app.buildName, os: $.os,
        project: app.project.file ? app.project.file.fsName : null, dirty: app.project.dirty,
        numItems: app.project.numItems, allowRaw: v2AllowRaw, bridgeDir: v2BridgeDir().fsName
    };
    try { r.activeComp = app.project.activeItem instanceof CompItem ? app.project.activeItem.name : null; } catch (e) { }
    try {
        for (var i = 1; i <= app.project.numItems; i++) {
            if (app.project.item(i) instanceof CompItem) { r.saveFrameToPng = typeof app.project.item(i).saveFrameToPng === "function"; break; }
        }
    } catch (e2) { }
    return r;
};

V2.project = function (a) {
    var action = a.action || "info", f;
    if (action === "new") {
        if (a.force) { app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES); }
        app.newProject();
    } else if (action === "open") {
        f = new File(a.path);
        if (!f.exists) { v2Fail("File not found: " + a.path); }
        if (a.force) { app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES); }
        app.open(f);
    } else if (action === "save") {
        if (a.path) { app.project.save(new File(a.path)); }
        else if (app.project.file) { app.project.save(); }
        else { v2Fail("Project has never been saved; pass path"); }
    } else if (action === "close") {
        app.project.close(a.save ? CloseOptions.SAVE_CHANGES : CloseOptions.DO_NOT_SAVE_CHANGES);
    } else if (action !== "info") {
        v2Fail("action must be info|new|open|save|close");
    }
    var items = [];
    var limit = a.maxItems || 200;
    for (var i = 1; i <= app.project.numItems && items.length < limit; i++) {
        var it = app.project.item(i);
        var o = { index: i, id: it.id, name: it.name, type: it.typeName };
        if (it instanceof CompItem) { o.width = it.width; o.height = it.height; o.duration = it.duration; o.frameRate = it.frameRate; o.numLayers = it.numLayers; }
        try { if (it.parentFolder && it.parentFolder !== app.project.rootFolder) { o.folder = it.parentFolder.name; } } catch (e) { }
        items.push(o);
    }
    return { file: app.project.file ? app.project.file.fsName : null, dirty: app.project.dirty, bitsPerChannel: app.project.bitsPerChannel, numItems: app.project.numItems, items: items };
};

V2.comp_create = function (a) {
    var c = app.project.items.addComp(a.name || "Comp", a.width || 1920, a.height || 1080, a.pixelAspect || 1, a.duration || 10, a.frameRate || 24);
    if (a.folder) { c.parentFolder = v2Folder(a.folder); }
    var w = [];
    v2ApplyCompSettings(c, a, w);
    return { comp: v2CompInfo(c), warnings: w };
};

V2.comp_set = function (a) {
    var c = v2Comp(a.comp), w = [];
    v2ApplyCompSettings(c, a, w);
    var r = v2CompInfo(c);
    r.motionBlur = c.motionBlur; r.renderer = c.renderer; r.shutterAngle = c.shutterAngle;
    return { comp: r, warnings: w };
};

V2.comp_tree = function (a) {
    var c = v2Comp(a.comp), layers = [];
    for (var i = 1; i <= c.numLayers; i++) {
        var l = c.layer(i), o = v2LayerInfo(l);
        try { o.autoOrient = String(l.autoOrient); o.motionBlur = l.motionBlur; o.collapse = l.collapseTransformation; o.blendMode = String(l.blendingMode); } catch (e) { }
        try { if (l.source) { o.source = l.source.name; } } catch (e2) { }
        var fx = l.property("ADBE Effect Parade");
        if (fx && fx.numProperties) {
            o.effects = [];
            for (var j = 1; j <= fx.numProperties; j++) { o.effects.push(fx.property(j).name); }
        }
        if (a.withTransform) {
            var tg = l.property("ADBE Transform Group");
            o.transform = {};
            for (var k = 1; k <= tg.numProperties; k++) {
                var tp = tg.property(k);
                try { o.transform[tp.name] = { value: v2Out(tp.value), numKeys: tp.numKeys, expression: tp.expression || undefined }; } catch (e3) { }
            }
        }
        layers.push(o);
    }
    var r = v2CompInfo(c);
    r.motionBlur = c.motionBlur; r.renderer = c.renderer; r.layers = layers;
    return r;
};

V2.layer_create = function (a) {
    var c = v2Comp(a.comp), l, t = a.type || "null", w = [];
    var dur = a.duration !== undefined ? a.duration : c.duration;
    if (t === "null") { l = c.layers.addNull(dur); }
    else if (t === "solid" || t === "adjustment") {
        var size = a.size || [c.width, c.height];
        l = c.layers.addSolid(v2Color(a.color || [0, 0, 0]), a.name || (t === "adjustment" ? "Adjustment Layer" : "Solid"), size[0], size[1], c.pixelAspect, dur);
        if (t === "adjustment") { l.adjustmentLayer = true; }
    }
    else if (t === "shape") { l = c.layers.addShape(); }
    else if (t === "text") { l = a.boxSize ? c.layers.addBoxText(a.boxSize, a.text || "") : c.layers.addText(a.text || ""); }
    else if (t === "camera") { l = c.layers.addCamera(a.name || "Camera", [c.width / 2, c.height / 2]); }
    else if (t === "light") {
        l = c.layers.addLight(a.name || "Light", [c.width / 2, c.height / 2]);
        if (a.lightType) { l.lightType = LightType[v2EnumName(a.lightType)]; }
    }
    else if (t === "item") { l = c.layers.add(v2Item(a.item), dur); }
    else { v2Fail("type must be null|solid|adjustment|shape|text|camera|light|item"); }
    if (a.name && t !== "solid" && t !== "adjustment") { l.name = a.name; }
    if (t === "shape" || t === "text") {
        try { l.property("ADBE Transform Group").property("ADBE Position").setValue([c.width / 2, c.height / 2]); } catch (e) { }
    }
    if (a.shape) {
        if (t !== "shape") { v2Fail("shape contents need type: shape"); }
        v2BuildShapeContents(l.property("ADBE Root Vectors Group"), a.shape, w);
    }
    if (a.textStyle && t === "text") {
        var sp = l.property("ADBE Text Properties").property("ADBE Text Document");
        sp.setValue(v2In(sp, a.textStyle, c));
    }
    if (a.set) { v2ApplyLayerSettings(l, a.set, w); }
    return { layer: v2LayerInfo(l), warnings: w };
};

V2.layer_set = function (a) {
    var c = v2Comp(a.comp), w = [], refs = a.layers || [a.layer], out = [];
    for (var i = 0; i < refs.length; i++) {
        var l = v2Layer(c, refs[i]);
        v2ApplyLayerSettings(l, a.set || {}, w);
        out.push(v2LayerInfo(l));
    }
    return { layers: out, warnings: w };
};

V2.layer_duplicate = function (a) {
    var c = v2Comp(a.comp), src = v2Layer(c, a.layer), out = [], w = [];
    var n = a.count || 1;
    for (var i = 0; i < n; i++) {
        var d = src.duplicate();
        if (a.names && a.names[i]) { d.name = a.names[i]; }
        if (a.sets && a.sets[i]) { v2ApplyLayerSettings(d, a.sets[i], w); }
        out.push(v2LayerInfo(d));
    }
    return { layers: out, warnings: w };
};

V2.layer_delete = function (a) {
    var c = v2Comp(a.comp), refs = a.layers || [a.layer], names = [], ls = [], i;
    for (i = 0; i < refs.length; i++) { ls.push(v2Layer(c, refs[i])); }
    for (i = 0; i < ls.length; i++) { names.push(ls[i].name); ls[i].remove(); }
    return { deleted: names };
};

V2.precompose = function (a) {
    var c = v2Comp(a.comp), idx = [];
    for (var i = 0; i < a.layers.length; i++) { idx.push(v2Layer(c, a.layers[i]).index); }
    var nc = c.layers.precompose(idx, a.name || "Precomp", a.moveAll !== false);
    var placed = null;
    for (var j = 1; j <= c.numLayers; j++) {
        try { if (c.layer(j).source === nc) { placed = v2LayerInfo(c.layer(j)); } } catch (e) { }
    }
    return { comp: v2CompInfo(nc), layer: placed };
};

function v2Folder(name) {
    for (var i = 1; i <= app.project.numItems; i++) {
        var it = app.project.item(i);
        if (it instanceof FolderItem && it.name === name) { return it; }
    }
    return app.project.items.addFolder(name);
}

V2.import_file = function (a) {
    var path = a.path;
    if (a.asset) { path = v2SubDir("assets").fsName + "/" + a.asset; }
    var f = new File(path);
    if (!f.exists) { v2Fail("File not found: " + f.fsName); }
    var io = new ImportOptions(f);
    var as = { footage: "FOOTAGE", comp: "COMP", compCropped: "COMP_CROPPED_LAYERS", project: "PROJECT" }[a.importAs || "footage"];
    if (io.canImportAs(ImportAsType[as])) { io.importAs = ImportAsType[as]; }
    if (a.sequence) { io.sequence = true; }
    var item = app.project.importFile(io);
    if (a.name) { item.name = a.name; }
    if (a.folder) { item.parentFolder = v2Folder(a.folder); }
    var r = { item: { id: item.id, name: item.name, type: item.typeName } };
    if (item instanceof CompItem) { r.item.width = item.width; r.item.height = item.height; r.item.numLayers = item.numLayers; }
    if (a.addToComp !== undefined) {
        var c = v2Comp(a.addToComp), w = [];
        var l = c.layers.add(item);
        if (a.set) { v2ApplyLayerSettings(l, a.set, w); }
        r.layer = v2LayerInfo(l); r.warnings = w;
    }
    return r;
};

V2.prop_get = function (a) {
    var c = v2Comp(a.comp), l = v2Layer(c, a.layer), p = v2Prop(l, a.path);
    if (p.propertyType !== PropertyType.PROPERTY) { return v2Dump(p, a.depth !== undefined ? a.depth : 1, null, { n: a.maxNodes || 400 }); }
    var r = { name: p.name, matchName: p.matchName, value: v2Out(a.time !== undefined ? p.valueAtTime(a.time, false) : p.value), numKeys: p.numKeys };
    if (p.expression) { r.expression = p.expression; r.expressionError = p.expressionError; }
    if (p.numKeys > 0 && a.withKeys) {
        r.keys = [];
        for (var k = 1; k <= p.numKeys; k++) { r.keys.push({ time: p.keyTime(k), value: v2Out(p.keyValue(k)) }); }
    }
    return r;
};

V2.prop_set = function (a) {
    var c = v2Comp(a.comp), l = v2Layer(c, a.layer), sets = a.sets || [{ path: a.path, value: a.value }], out = [];
    for (var i = 0; i < sets.length; i++) {
        var p = v2Prop(l, sets[i].path);
        var v = v2In(p, sets[i].value, c);
        if (p.numKeys > 0) {
            if (sets[i].time !== undefined) { p.setValueAtTime(sets[i].time, v); }
            else if (a.clearKeys) { while (p.numKeys > 0) { p.removeKey(1); } p.setValue(v); }
            else { p.setValueAtTime(c.time, v); }
        } else if (sets[i].time !== undefined) { p.setValueAtTime(sets[i].time, v); }
        else { p.setValue(v); }
        out.push({ path: v2Path(sets[i].path).join("/"), value: v2Out(p.value) });
    }
    return { set: out };
};

V2.prop_tree = function (a) {
    var c = v2Comp(a.comp), l = v2Layer(c, a.layer);
    var root = a.path ? v2Prop(l, a.path) : l;
    var budget = { n: a.maxNodes || 600 };
    var r = v2Dump(root, a.depth !== undefined ? a.depth : 3, null, budget);
    if (budget.n <= 0) { r.truncated = true; }
    return r;
};

V2.keyframes = function (a) {
    var c = v2Comp(a.comp), l = v2Layer(c, a.layer), p = v2Prop(l, a.path);
    if (!p.canVaryOverTime) { v2Fail("Property cannot be animated: " + p.name); }
    if (a.replace) { while (p.numKeys > 0) { p.removeKey(1); } }
    var keys = a.keys || [], idx = [], i, k;
    for (i = 0; i < keys.length; i++) {
        p.setValueAtTime(keys[i].time, v2In(p, keys[i].value, c));
    }
    for (i = 0; i < keys.length; i++) { idx.push(p.nearestKeyIndex(keys[i].time)); }
    for (i = 0; i < keys.length; i++) {
        var key = keys[i], ki = idx[i];
        var interp = key.interp || a.interp;
        if (interp) {
            var it = KeyframeInterpolationType[V2_INTERP[interp] || "BEZIER"];
            p.setInterpolationTypeAtKey(ki, it, it);
        }
        var easeIn = key.easeIn || a.easeIn, easeOut = key.easeOut || a.easeOut;
        if (a.ease === "easy" && !easeIn) { easeIn = [0, 33.33]; }
        if (a.ease === "easy" && !easeOut) { easeOut = [0, 33.33]; }
        if (easeIn || easeOut) {
            p.setTemporalEaseAtKey(ki, v2Ease(p, easeIn || [0, 16.67]), v2Ease(p, easeOut || [0, 16.67]));
        }
        if (a.ease === "auto" || key.auto) {
            p.setTemporalContinuousAtKey(ki, true);
            p.setTemporalAutoBezierAtKey(ki, true);
        }
        if (key.spatialIn && key.spatialOut) { p.setSpatialTangentsAtKey(ki, key.spatialIn, key.spatialOut); }
        if (key.roving) { p.setRovingAtKey(ki, true); }
    }
    var times = [];
    for (k = 1; k <= p.numKeys; k++) { times.push(p.keyTime(k)); }
    return { property: p.name, numKeys: p.numKeys, keyTimes: times };
};

V2.expression = function (a) {
    var c = v2Comp(a.comp), sets = a.sets || [{ layer: a.layer, path: a.path, expression: a.expression }], out = [];
    for (var i = 0; i < sets.length; i++) {
        var s = sets[i], refs = s.layers || [s.layer];
        for (var j = 0; j < refs.length; j++) {
            var l = v2Layer(c, refs[j]), p = v2Prop(l, s.path);
            if (!p.canSetExpression) { v2Fail("Expressions not allowed on " + p.name); }
            p.expression = s.expression || "";
            var err = "";
            try { p.valueAtTime(c.time, false); err = p.expressionError; } catch (e) { err = e.toString(); }
            out.push({ layer: l.name, path: v2Path(s.path).join("/"), error: err || null });
        }
    }
    return { expressions: out };
};

V2.effect_add = function (a) {
    var c = v2Comp(a.comp), refs = a.layers || [a.layer], out = [], w = [];
    for (var j = 0; j < refs.length; j++) {
        var l = v2Layer(c, refs[j]);
        var parade = l.property("ADBE Effect Parade");
        var key = a.matchName || a.name;
        if (!parade.canAddProperty(key)) { v2Fail("Effect not available: " + key); }
        var fx = parade.addProperty(key);
        if (a.rename) { fx.name = a.rename; }
        if (a.settings) { v2EffectSettings(fx, a.settings, c, w); }
        out.push({ layer: l.name, effect: fx.name, matchName: fx.matchName, index: fx.propertyIndex });
    }
    return { effects: out, warnings: w };
};

function v2EffectSettings(fx, settings, comp, w) {
    for (var k in settings) {
        if (!settings.hasOwnProperty(k)) { continue; }
        try {
            var p = v2Prop(fx, k);
            p.setValue(v2In(p, settings[k], comp));
        } catch (e) { w.push(k + ": " + e.toString()); }
    }
}

V2.effect_set = function (a) {
    var c = v2Comp(a.comp), l = v2Layer(c, a.layer), w = [];
    var parade = l.property("ADBE Effect Parade");
    var fx = v2Prop(parade, [a.effect]);
    if (a.enabled !== undefined) { fx.enabled = !!a.enabled; }
    if (a.moveTo !== undefined) { fx.moveTo(a.moveTo); }
    if (a.settings) { v2EffectSettings(fx, a.settings, c, w); }
    if (a.remove) { var n = fx.name; fx.remove(); return { removed: n }; }
    return { effect: fx.name, index: fx.propertyIndex, warnings: w };
};

V2.effects_list = function (a) {
    var q = a.query ? String(a.query).toLowerCase() : "", out = [];
    var all = app.effects;
    for (var i = 0; i < all.length; i++) {
        var e = all[i];
        var hay = (e.displayName + " " + e.matchName + " " + e.category).toLowerCase();
        if (!q || hay.indexOf(q) !== -1) { out.push({ name: e.displayName, matchName: e.matchName, category: e.category }); }
        if (out.length >= (a.limit || 200)) { break; }
    }
    return { count: out.length, effects: out };
};

V2.shape_build = function (a) {
    var c = v2Comp(a.comp), w = [], l;
    if (a.layer !== undefined) {
        l = v2Layer(c, a.layer);
        if (!(l instanceof ShapeLayer)) { v2Fail("Layer is not a shape layer"); }
    } else {
        l = c.layers.addShape();
        if (a.name) { l.name = a.name; }
        // Layer space == comp space unless overridden by set.transform.
        l.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([0, 0]);
        l.property("ADBE Transform Group").property("ADBE Position").setValue([0, 0]);
    }
    var root = l.property("ADBE Root Vectors Group");
    if (a.replace) { while (root.numProperties > 0) { root.property(1).remove(); } }
    v2BuildShapeContents(root, a.contents || [], w);
    if (a.set) { v2ApplyLayerSettings(l, a.set, w); }
    return { layer: v2LayerInfo(l), warnings: w };
};

V2.mask = function (a) {
    var c = v2Comp(a.comp), l = v2Layer(c, a.layer), m, w = [];
    var masks = l.property("ADBE Mask Parade");
    if (a.remove !== undefined) { masks.property(a.remove).remove(); return { removed: a.remove }; }
    m = a.maskIndex ? masks.property(a.maskIndex) : masks.addProperty("ADBE Mask Atom");
    var shape = null;
    if (a.vertices) { shape = v2ToShape(a); }
    else if (a.rect) {
        var r = a.rect;
        shape = v2ToShape({ vertices: [[r[0], r[1]], [r[0] + r[2], r[1]], [r[0] + r[2], r[1] + r[3]], [r[0], r[1] + r[3]]] });
    } else if (a.ellipse) {
        var cx = a.ellipse.center[0], cy = a.ellipse.center[1], rx = a.ellipse.size[0] / 2, ry = a.ellipse.size[1] / 2, k = 0.5523;
        shape = v2ToShape({
            vertices: [[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]],
            inTangents: [[-rx * k, 0], [0, -ry * k], [rx * k, 0], [0, ry * k]],
            outTangents: [[rx * k, 0], [0, ry * k], [-rx * k, 0], [0, -ry * k]]
        });
    }
    if (shape) { m.property("ADBE Mask Shape").setValue(shape); }
    if (a.mode) { m.maskMode = MaskMode[v2EnumName(a.mode)]; }
    if (a.inverted !== undefined) { m.inverted = !!a.inverted; }
    if (a.feather !== undefined) { m.property("ADBE Mask Feather").setValue(a.feather instanceof Array ? a.feather : [a.feather, a.feather]); }
    if (a.opacity !== undefined) { m.property("ADBE Mask Opacity").setValue(a.opacity); }
    if (a.expansion !== undefined) { m.property("ADBE Mask Offset").setValue(a.expansion); }
    if (a.name) { m.name = a.name; }
    return { layer: l.name, mask: m.name, index: m.propertyIndex, warnings: w };
};

V2.camera_set = function (a) {
    var c = v2Comp(a.comp), l = v2Layer(c, a.layer);
    if (!(l instanceof CameraLayer)) { v2Fail("Layer is not a camera"); }
    var o = l.property("ADBE Camera Options Group");
    var map = { zoom: "ADBE Camera Zoom", dof: "ADBE Camera Depth of Field", focusDistance: "ADBE Camera Focus Distance", aperture: "ADBE Camera Aperture", blurLevel: "ADBE Camera Blur Level" };
    for (var k in map) {
        if (a[k] !== undefined) { o.property(map[k]).setValue(k === "dof" ? (a[k] ? 1 : 0) : a[k]); }
    }
    if (a.focusOn !== undefined) {
        var target = v2Layer(c, a.focusOn.layer !== undefined ? a.focusOn.layer : a.focusOn);
        var pt = a.focusOn.point ? "[" + a.focusOn.point.join(",") + "]" : "thisComp.layer(\"" + target.name.replace(/"/g, "\\\"") + "\").anchorPoint";
        o.property("ADBE Camera Focus Distance").expression =
            "var t = thisComp.layer(\"" + target.name.replace(/"/g, "\\\"") + "\");\nlength(toWorld([0,0,0]), t.toWorld(" + pt + "))";
    }
    if (a.set) { v2ApplyLayerSettings(l, a.set, []); }
    var r = {};
    for (var k2 in map) { r[k2] = o.property(map[k2]).value; }
    return { camera: l.name, options: r };
};

V2.render_frame = function (a) {
    var c = v2Comp(a.comp);
    if (typeof c.saveFrameToPng !== "function") { v2Fail("CompItem.saveFrameToPng is not available in this After Effects version"); }
    var times = a.times || [a.time !== undefined ? a.time : c.time];
    var maxW = a.maxWidth || 1280;
    var dir = v2SubDir("frames");
    // Remove preview comps from earlier calls (their renders have finished by now).
    for (var i = app.project.numItems; i >= 1; i--) {
        var it = app.project.item(i);
        if (it instanceof CompItem && it.name.indexOf("__mcp_preview") === 0) { try { it.remove(); } catch (e) { } }
    }
    var src = c, scale = 1;
    if (c.width > maxW) {
        scale = maxW / c.width;
        var pw = Math.round(c.width * scale), ph = Math.round(c.height * scale);
        src = app.project.items.addComp("__mcp_preview", pw, ph, c.pixelAspect, c.duration, c.frameRate);
        var pl = src.layers.add(c);
        pl.property("ADBE Transform Group").property("ADBE Scale").setValue([scale * 100, scale * 100]);
        pl.property("ADBE Transform Group").property("ADBE Position").setValue([pw / 2, ph / 2]);
    }
    var files = [];
    var stamp = new Date().getTime();
    for (var t = 0; t < times.length; t++) {
        var f = new File(dir.fsName + "/frame_" + stamp + "_" + t + ".png");
        src.saveFrameToPng(times[t], f);
        files.push({ time: times[t], file: f.fsName });
    }
    return { comp: c.name, width: src.width, height: src.height, scale: scale, frames: files };
};

var V2_RQ_STATUS = {};
function v2RqStatusName(s) {
    if (!V2_RQ_STATUS.init) {
        var names = ["DONE", "ERR_STOPPED", "NEEDS_OUTPUT", "QUEUED", "RENDERING", "UNQUEUED", "USER_STOPPED", "WILL_CONTINUE"];
        for (var i = 0; i < names.length; i++) { try { V2_RQ_STATUS[RQItemStatus[names[i]]] = names[i]; } catch (e) { } }
        V2_RQ_STATUS.init = true;
    }
    return V2_RQ_STATUS[s] || String(s);
}

function v2RqList() {
    var rq = app.project.renderQueue, out = [];
    for (var i = 1; i <= rq.numItems; i++) {
        var it = rq.item(i), o = { index: i, comp: it.comp.name, status: v2RqStatusName(it.status) };
        try { o.output = it.outputModule(1).file ? it.outputModule(1).file.fsName : null; } catch (e) { }
        try { o.elapsedSeconds = it.elapsedSeconds; } catch (e2) { }
        out.push(o);
    }
    return out;
}

V2.render_queue = function (a) {
    var rq = app.project.renderQueue, action = a.action || "list", w = [];
    if (action === "add") {
        var c = v2Comp(a.comp);
        var item = rq.items.add(c);
        if (a.start !== undefined) { item.timeSpanStart = a.start; }
        if (a.duration !== undefined) { item.timeSpanDuration = a.duration; }
        if (a.renderTemplate) { try { item.applyTemplate(a.renderTemplate); } catch (e) { w.push("render template: " + e.toString()); } }
        if (a.resolution) {
            var resName = { full: "Full", half: "Half", third: "Third", quarter: "Quarter" }[a.resolution];
            try { item.setSettings({ "Resolution": resName }); }
            catch (e2) { w.push("resolution: " + e2.toString()); }
        }
        var om = item.outputModule(1);
        var tmpls = a.outputTemplate ? [a.outputTemplate] : ["H.264 - Match Render Settings - 15 Mbps", "H.264 - Match Render Settings -  15 Mbps", "H.264 - Match Render Settings - 40 Mbps", "H.264"];
        var used = null;
        for (var t = 0; t < tmpls.length && !used; t++) { try { om.applyTemplate(tmpls[t]); used = tmpls[t]; } catch (e3) { } }
        if (!used) { w.push("No requested output template found; using the default output module"); }
        var outPath = a.output || (v2SubDir("renders").fsName + "/" + c.name.replace(/[^\w\-]+/g, "_"));
        om.file = new File(outPath);
        return { added: rq.numItems, outputTemplate: used, output: om.file.fsName, warnings: w, queue: v2RqList() };
    }
    if (action === "templates") {
        var r = { renderTemplates: [], outputTemplates: [] };
        var tmp = rq.items.add(app.project.activeItem instanceof CompItem ? app.project.activeItem : v2Comp(a.comp));
        r.renderTemplates = tmp.templates; r.outputTemplates = tmp.outputModule(1).templates;
        tmp.remove();
        return r;
    }
    if (action === "start") {
        // Blocks After Effects until the queue finishes.
        rq.render();
        return { queue: v2RqList() };
    }
    if (action === "clear") {
        for (var i = rq.numItems; i >= 1; i--) {
            if (a.onlyDone && rq.item(i).status !== RQItemStatus.DONE) { continue; }
            rq.item(i).remove();
        }
        return { queue: v2RqList() };
    }
    if (action === "ame") { rq.queueInAME(!!a.startAME); return { queuedInAME: true }; }
    return { queue: v2RqList() };
};

V2.run_jsx = function (a) {
    if (!v2AllowRaw) { v2Fail("Raw scripts are disabled. Tick 'Allow raw scripts' in the MCP Bridge panel."); }
    $.global.MCP_ARGS = a.params || {};
    var r;
    if (a.file) {
        var base = v2BridgeDir().fsName;
        var rel = String(a.file).replace(/\\/g, "/");
        if (rel.indexOf("..") !== -1 || rel.charAt(0) === "/" || rel.indexOf(":") !== -1) { v2Fail("file must be relative to the bridge folder (scripts/ or assets/)"); }
        if (rel.indexOf("scripts/") !== 0 && rel.indexOf("assets/") !== 0) { rel = "scripts/" + rel; }
        var f = new File(base + "/" + rel);
        if (!f.exists) { v2Fail("Script not found: " + f.fsName); }
        r = $.evalFile(f);
    } else {
        r = eval(String(a.code));
    }
    if (r === undefined || r === null) { return { value: null }; }
    if (typeof r === "object") { try { return { value: JSON.parse(JSON.stringify(r)) }; } catch (e) { } }
    return { value: String(r) };
};

V2.undo = function (a) {
    var n = a.count || 1;
    for (var i = 0; i < n; i++) { app.executeCommand(16); }
    return { undone: n };
};

V2.batch = function (a) {
    var ops = a.ops || [], out = [];
    for (var i = 0; i < ops.length; i++) {
        var h = V2[ops[i].command];
        try {
            if (!h || ops[i].command === "batch") { v2Fail("Unknown command in batch: " + ops[i].command); }
            out.push({ ok: true, result: h(ops[i].args || {}) });
        } catch (e) {
            out.push({ ok: false, error: e.toString(), line: e.line });
            if (a.stopOnError !== false) { break; }
        }
    }
    return { results: out };
};

// ---------- dispatcher & queue ----------

function v2Dispatch(command, args) {
    var h = V2[command];
    if (!h) { return { ok: false, error: "Unknown v2 command: " + command }; }
    // Read-only commands, file/project actions and raw scripts (which manage their own undo groups) skip the undo group.
    var undo = !{ ping: 1, render_frame: 1, project: 1, render_queue: 1, run_jsx: 1, comp_tree: 1, prop_get: 1, prop_tree: 1, effects_list: 1 }[command];
    if (undo) { app.beginUndoGroup("MCP: " + command); }
    try { app.beginSuppressDialogs(); } catch (e0) { }
    try {
        return { ok: true, result: h(args || {}) };
    } catch (e) {
        return { ok: false, error: e.toString(), line: e.line };
    } finally {
        try { app.endSuppressDialogs(false); } catch (e1) { }
        if (undo) { app.endUndoGroup(); }
    }
}

function v2ProcessQueue() {
    var q = v2SubDir("queue"), resDir = v2SubDir("results");
    var files = q.getFiles("cmd_*.json");
    if (!files || !files.length) { return 0; }
    files.sort(function (x, y) { return x.name < y.name ? -1 : (x.name > y.name ? 1 : 0); });
    var done = 0, started = new Date().getTime();
    for (var i = 0; i < files.length; i++) {
        var f = files[i];
        var id = f.name.replace(/^cmd_/, "").replace(/\.json$/, "");
        // Claim the command atomically so it never runs twice.
        if (!f.rename("run_" + id + ".json")) { continue; }
        var running = new File(q.fsName + "/run_" + id + ".json");
        var payload = null, res;
        try { payload = JSON.parse(v2ReadText(running)); } catch (e) { res = { ok: false, error: "Bad command file: " + e.toString() }; }
        if (payload) {
            try { logToPanel("v2 " + payload.command); statusText.text = "Running: " + payload.command; } catch (eLog) { }
            res = v2Dispatch(payload.command, payload.args);
        }
        res.id = id;
        res.command = payload ? payload.command : null;
        var tmp = new File(resDir.fsName + "/res_" + id + ".json.tmp");
        try { v2WriteText(tmp, JSON.stringify(res)); }
        catch (eW) { v2WriteText(tmp, JSON.stringify({ ok: false, id: id, error: "Result not serialisable: " + eW.toString() })); }
        var old = new File(resDir.fsName + "/res_" + id + ".json");
        if (old.exists) { old.remove(); }
        tmp.rename("res_" + id + ".json");
        running.remove();
        done++;
        try { statusText.text = (res.ok ? "Done: " : "Error: ") + res.command; } catch (eS) { }
        // Yield back to AE after ~2 s of work so the UI stays responsive.
        if (new Date().getTime() - started > 2000) { break; }
    }
    return done;
}
// ===== MCP V2 END =====

// Detect AE version (AE 2025 = version 25.x, AE 2026 = version 26.x)
var aeVersion = parseFloat(app.version);
var isAE2025OrLater = aeVersion >= 25.0;

// Always create a floating palette window for AE 2025+
var panel = new Window("palette", "MCP Bridge Auto", undefined);
panel.orientation = "column";
panel.alignChildren = ["fill", "top"];
panel.spacing = 10;
panel.margins = 16;

// Status display
var statusText = panel.add("statictext", undefined, "Waiting for commands...");
statusText.alignment = ["fill", "top"];

// Add log area
var logPanel = panel.add("panel", undefined, "Command Log");
logPanel.orientation = "column";
logPanel.alignChildren = ["fill", "fill"];
var logText = logPanel.add("edittext", undefined, "", {multiline: true, readonly: true});
logText.preferredSize.height = 200;

// AE 2025 warning
if (isAE2025OrLater) {
    var warning = panel.add("statictext", undefined, "AE 2025+: Dockable panels are not supported. Floating window only.");
    warning.graphics.foregroundColor = warning.graphics.newPen(warning.graphics.PenType.SOLID_COLOR, [1,0.3,0,1], 1);
}

// Auto-run checkbox
var autoRunCheckbox = panel.add("checkbox", undefined, "Auto-run commands");
autoRunCheckbox.value = true;

// Raw ExtendScript (ae_run_jsx) is off unless the user ticks this box; the choice persists.
var allowRawCheckbox = panel.add("checkbox", undefined, "Allow raw scripts (ae_run_jsx)");
allowRawCheckbox.value = v2AllowRaw;
allowRawCheckbox.onClick = function () {
    v2AllowRaw = allowRawCheckbox.value;
    try { app.settings.saveSetting("aeMcpBridge", "allowRaw", v2AllowRaw ? "1" : "0"); } catch (e) { }
    logToPanel("Raw scripts " + (v2AllowRaw ? "ENABLED" : "disabled"));
};

// Check interval (ms)
var checkInterval = 500;
var isChecking = false;

// Command file path - use Documents folder for reliable access
function getCommandFilePath() {
    var userFolder = Folder.myDocuments;
    var bridgeFolder = new Folder(userFolder.fsName + "/ae-mcp-bridge");
    if (!bridgeFolder.exists) {
        bridgeFolder.create();
    }
    return bridgeFolder.fsName + "/ae_command.json";
}

// Result file path - use Documents folder for reliable access
function getResultFilePath() {
    var userFolder = Folder.myDocuments;
    var bridgeFolder = new Folder(userFolder.fsName + "/ae-mcp-bridge");
    if (!bridgeFolder.exists) {
        bridgeFolder.create();
    }
    return bridgeFolder.fsName + "/ae_mcp_result.json";
}

// --- setCompositionProperties: set duration, frameRate, etc. on active or named comp ---
function setCompositionProperties(args) {
    try {
        var compName = args.compName || "";
        var comp = null;
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem && item.name === compName) { comp = item; break; }
        }
        if (!comp) {
            if (app.project.activeItem instanceof CompItem) { comp = app.project.activeItem; }
            else { throw new Error("No composition found with name '" + compName + "' and no active composition"); }
        }
        var changed = [];
        if (args.duration !== undefined && args.duration !== null) { comp.duration = args.duration; changed.push("duration"); }
        if (args.frameRate !== undefined && args.frameRate !== null) { comp.frameRate = args.frameRate; changed.push("frameRate"); }
        if (args.width !== undefined && args.width !== null && args.height !== undefined && args.height !== null) {
            comp.width = args.width; comp.height = args.height; changed.push("dimensions");
        }
        return JSON.stringify({
            status: "success",
            composition: { name: comp.name, duration: comp.duration, frameRate: comp.frameRate, width: comp.width, height: comp.height },
            changedProperties: changed
        }, null, 2);
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() }, null, 2);
    }
}

// Functions for each script type
function getProjectInfo() {
    var project = app.project;
    var result = {
        projectName: project.file ? project.file.name : "Untitled Project",
        path: project.file ? project.file.fsName : "",
        numItems: project.numItems,
        bitsPerChannel: project.bitsPerChannel,
        timeMode: project.timeDisplayType === TimeDisplayType.FRAMES ? "Frames" : "Timecode",
        items: []
    };

    // Count item types
    var countByType = {
        compositions: 0,
        footage: 0,
        folders: 0,
        solids: 0
    };

    // Get item information (limited for performance)
    for (var i = 1; i <= Math.min(project.numItems, 50); i++) {
        var item = project.item(i);
        var itemType = "";
        
        if (item instanceof CompItem) {
            itemType = "Composition";
            countByType.compositions++;
        } else if (item instanceof FolderItem) {
            itemType = "Folder";
            countByType.folders++;
        } else if (item instanceof FootageItem) {
            if (item.mainSource instanceof SolidSource) {
                itemType = "Solid";
                countByType.solids++;
            } else {
                itemType = "Footage";
                countByType.footage++;
            }
        }
        
        result.items.push({
            id: item.id,
            name: item.name,
            type: itemType
        });
    }
    
    result.itemCounts = countByType;

    // Include active composition metadata if available
    if (app.project.activeItem instanceof CompItem) {
        var ac = app.project.activeItem;
        result.activeComp = {
            id: ac.id,
            name: ac.name,
            width: ac.width,
            height: ac.height,
            duration: ac.duration,
            frameRate: ac.frameRate,
            numLayers: ac.numLayers
        };
    }

    return JSON.stringify(result, null, 2);
}

function listCompositions() {
    var project = app.project;
    var result = {
        compositions: []
    };
    
    // Loop through items in the project
    for (var i = 1; i <= project.numItems; i++) {
        var item = project.item(i);
        
        // Check if the item is a composition
        if (item instanceof CompItem) {
            result.compositions.push({
                id: item.id,
                name: item.name,
                duration: item.duration,
                frameRate: item.frameRate,
                width: item.width,
                height: item.height,
                numLayers: item.numLayers
            });
        }
    }
    
    return JSON.stringify(result, null, 2);
}

function getLayerInfo() {
    var project = app.project;
    var result = {
        layers: []
    };
    
    // Get the active composition
    var activeComp = null;
    if (app.project.activeItem instanceof CompItem) {
        activeComp = app.project.activeItem;
    } else {
        return JSON.stringify({ error: "No active composition" }, null, 2);
    }
    
    // Loop through layers in the active composition
    for (var i = 1; i <= activeComp.numLayers; i++) {
        var layer = activeComp.layer(i);
        var layerInfo = {
            index: layer.index,
            name: layer.name,
            enabled: layer.enabled,
            locked: layer.locked,
            threeDLayer: layer.threeDLayer,
            position: layer.property("Position").value,
            inPoint: layer.inPoint,
            outPoint: layer.outPoint
        };
        
        result.layers.push(layerInfo);
    }
    
    return JSON.stringify(result, null, 2);
}

// Execute command
function executeCommand(command, args) {
    var result = "";

    logToPanel("Executing command: " + command);
    statusText.text = "Running: " + command;
    panel.update();

    try {
        logToPanel("Attempting to execute: " + command); // Log before switch
        // Use a switch statement for clarity
        switch (command) {
            case "getProjectInfo":
                result = getProjectInfo();
                break;
            case "listCompositions":
                result = listCompositions();
                break;
            case "getLayerInfo":
                result = getLayerInfo();
                break;
            case "createComposition":
                logToPanel("Calling createComposition function...");
                result = createComposition(args);
                logToPanel("Returned from createComposition.");
                break;
            case "createTextLayer":
                logToPanel("Calling createTextLayer function...");
                result = createTextLayer(args);
                logToPanel("Returned from createTextLayer.");
                break;
            case "createShapeLayer":
                logToPanel("Calling createShapeLayer function...");
                result = createShapeLayer(args);
                logToPanel("Returned from createShapeLayer. Result type: " + typeof result);
                break;
            case "createSolidLayer":
                logToPanel("Calling createSolidLayer function...");
                result = createSolidLayer(args);
                logToPanel("Returned from createSolidLayer.");
                break;
            case "setLayerProperties":
                logToPanel("Calling setLayerProperties function...");
                result = setLayerProperties(args);
                logToPanel("Returned from setLayerProperties.");
                break;
            case "setLayerKeyframe":
                logToPanel("Calling setLayerKeyframe function...");
                result = setLayerKeyframe(args.compIndex, args.layerIndex, args.propertyName, args.timeInSeconds, args.value);
                logToPanel("Returned from setLayerKeyframe.");
                break;
            case "setLayerExpression":
                logToPanel("Calling setLayerExpression function...");
                result = setLayerExpression(args.compIndex, args.layerIndex, args.propertyName, args.expressionString);
                logToPanel("Returned from setLayerExpression.");
                break;
            case "applyEffect":
                logToPanel("Calling applyEffect function...");
                result = applyEffect(args);
                logToPanel("Returned from applyEffect.");
                break;
            case "applyEffectTemplate":
                logToPanel("Calling applyEffectTemplate function...");
                result = applyEffectTemplate(args);
                logToPanel("Returned from applyEffectTemplate.");
                break;
            case "bridgeTestEffects":
                logToPanel("Calling bridgeTestEffects function...");
                result = bridgeTestEffects(args);
                logToPanel("Returned from bridgeTestEffects.");
                break;
            case "createCamera":
                logToPanel("Calling createCamera function...");
                result = createCamera(args);
                logToPanel("Returned from createCamera.");
                break;
            case "batchSetLayerProperties":
                logToPanel("Calling batchSetLayerProperties function...");
                result = batchSetLayerProperties(args);
                logToPanel("Returned from batchSetLayerProperties.");
                break;
            case "setCompositionProperties":
                logToPanel("Calling setCompositionProperties function...");
                result = setCompositionProperties(args);
                logToPanel("Returned from setCompositionProperties.");
                break;
            case "duplicateLayer":
                logToPanel("Calling duplicateLayer function...");
                result = duplicateLayer(args);
                logToPanel("Returned from duplicateLayer.");
                break;
            case "deleteLayer":
                logToPanel("Calling deleteLayer function...");
                result = deleteLayer(args);
                logToPanel("Returned from deleteLayer.");
                break;
            case "setLayerMask":
                logToPanel("Calling setLayerMask function...");
                result = setLayerMask(args);
                logToPanel("Returned from setLayerMask.");
                break;
            default:
                result = JSON.stringify({ error: "Unknown command: " + command });
        }
        logToPanel("Execution finished for: " + command); // Log after switch
        
        // Save the result (ensure result is always a string)
        logToPanel("Preparing to write result file...");
        var resultString = (typeof result === 'string') ? result : JSON.stringify(result);
        
        // Try to parse the result as JSON to add a timestamp
        try {
            var resultObj = JSON.parse(resultString);
            // Add a timestamp to help identify if we're getting fresh results
            resultObj._responseTimestamp = new Date().toISOString();
            resultObj._commandExecuted = command;
            resultString = JSON.stringify(resultObj, null, 2);
            logToPanel("Added timestamp to result JSON for tracking freshness.");
        } catch (parseError) {
            // If it's not valid JSON, append the timestamp as a comment
            logToPanel("Could not parse result as JSON to add timestamp: " + parseError.toString());
            // We'll still continue with the original string
        }
        
        var resultFile = new File(getResultFilePath());
        resultFile.encoding = "UTF-8"; // Ensure UTF-8 encoding
        logToPanel("Opening result file for writing...");
        var opened = resultFile.open("w");
        if (!opened) {
            logToPanel("ERROR: Failed to open result file for writing: " + resultFile.fsName);
            throw new Error("Failed to open result file for writing.");
        }
        logToPanel("Writing to result file...");
        var written = resultFile.write(resultString);
        if (!written) {
             logToPanel("ERROR: Failed to write to result file (write returned false): " + resultFile.fsName);
             // Still try to close, but log the error
        }
        logToPanel("Closing result file...");
        var closed = resultFile.close();
         if (!closed) {
             logToPanel("ERROR: Failed to close result file: " + resultFile.fsName);
             // Continue, but log the error
        }
        logToPanel("Result file write process complete.");
        
        logToPanel("Command completed successfully: " + command); // Changed log message
        statusText.text = "Command completed: " + command;
        
        // Update command file status
        logToPanel("Updating command status to completed...");
        updateCommandStatus("completed");
        logToPanel("Command status updated.");
        
    } catch (error) {
        var errorMsg = "ERROR in executeCommand for '" + command + "': " + error.toString() + (error.line ? " (line: " + error.line + ")" : "");
        logToPanel(errorMsg); // Log detailed error
        statusText.text = "Error: " + error.toString();
        
        // Write detailed error to result file
        try {
            logToPanel("Attempting to write ERROR to result file...");
            var errorResult = JSON.stringify({ 
                status: "error", 
                command: command,
                message: error.toString(),
                line: error.line,
                fileName: error.fileName
            });
            var errorFile = new File(getResultFilePath());
            errorFile.encoding = "UTF-8";
            if (errorFile.open("w")) {
                errorFile.write(errorResult);
                errorFile.close();
                logToPanel("Successfully wrote ERROR to result file.");
            } else {
                 logToPanel("CRITICAL ERROR: Failed to open result file to write error!");
            }
        } catch (writeError) {
             logToPanel("CRITICAL ERROR: Failed to write error to result file: " + writeError.toString());
        }
        
        // Update command file status even after error
        logToPanel("Updating command status to error...");
        updateCommandStatus("error");
        logToPanel("Command status updated to error.");
    }
}

// Update command file status
function updateCommandStatus(status) {
    try {
        var commandFile = new File(getCommandFilePath());
        if (commandFile.exists) {
            commandFile.open("r");
            var content = commandFile.read();
            commandFile.close();
            
            if (content) {
                var commandData = JSON.parse(content);
                commandData.status = status;
                
                commandFile.open("w");
                commandFile.write(JSON.stringify(commandData, null, 2));
                commandFile.close();
            }
        }
    } catch (e) {
        logToPanel("Error updating command status: " + e.toString());
    }
}

// Log message to panel
function logToPanel(message) {
    var timestamp = new Date().toLocaleTimeString();
    logText.text = timestamp + ": " + message + "\n" + logText.text;
}

// Check for new commands
function checkForCommands() {
    if (!autoRunCheckbox.value || isChecking) return;
    
    isChecking = true;

    try {
        v2ProcessQueue();
    } catch (eV2) {
        logToPanel("Error processing v2 queue: " + eV2.toString());
    }

    try {
        var commandFile = new File(getCommandFilePath());
        if (commandFile.exists) {
            commandFile.open("r");
            var content = commandFile.read();
            commandFile.close();
            
            if (content) {
                var commandData = (typeof JSON !== "undefined" && JSON.parse)
                    ? JSON.parse(content)
                    : eval("(" + content + ")");
                
                // Only execute pending commands
                if (commandData.status === "pending") {
                    // Update status to running
                    updateCommandStatus("running");
                    
                    // Execute the command
                    executeCommand(commandData.command, commandData.args || {});
                }
            }
        }
    } catch (e) {
        logToPanel("Error checking for commands: " + e.toString());
    }
    
    isChecking = false;
}

// Set up timer to check for commands
function startCommandChecker() {
    app.scheduleTask("checkForCommands()", checkInterval, true);
}

// Add manual check button
var checkButton = panel.add("button", undefined, "Check for Commands Now");
checkButton.onClick = function() {
    logToPanel("Manually checking for commands");
    checkForCommands();
};

// Log startup
logToPanel("MCP Bridge Auto started (v2 queue " + V2_VERSION + ")");
logToPanel("Command file: " + getCommandFilePath());
statusText.text = "Ready - Auto-run is " + (autoRunCheckbox.value ? "ON" : "OFF");

// Start the command checker
startCommandChecker();

// Show the panel
panel.center();
panel.show();

