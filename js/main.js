var nodeRequire = window["nodeRequire"] || window["require"];

var app;
var viewport;
var level;

var coloroffset = 0;

function hslToHex(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    let r, g, b;
    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    const toHex = x => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function displayLoadScreen(bool) {
    //TODO:
}

function displayGeoInfo(geo) {
    let editPopup = document.getElementById('edit-popup');
    let editPopupContent = document.getElementById('edit-popup-content');

    editPopup.style.display = "block";
    editPopupContent.innerHTML = `
    <span class="edit-close">x</span>
    <p1>Geometrical Shape | ${geo.id}</p1><br>
    <b>X</b>: ${geo.x}<br>
    <b>Y</b>: ${geo.y}<br>
    <b>Color</b>: ${geo.color}<br>
    <b>Support Points</b>: <a id="edit-supportpoints" class="waves-effect waves-light btn-small">Toggle Visibility</a><br>
    <div id="support-points" style="display:none;">
        - ${geo.geo.join("<br> - ")}
    </div><br>
    `

    //overwriting the edit-close class removes the onclick function, so we add it back
    document.getElementsByClassName("edit-close")[0].onclick = function() {
        editPopup.style.display = "none";
    }
    //same for other stuff that had .onclick in that popup
    document.getElementById("edit-supportpoints").onclick = function() {
        let supportpoints = document.getElementById("support-points");
        if(supportpoints.style.display === "none") {supportpoints.style.display = "block"} else supportpoints.style.display = "none"
    }
}


function renderGeo(geo, geoObject) {
    geoObject.moveTo(geo.geo[0].split(",")[0]-geo.x, geo.geo[0].split(",")[1]-geo.y);
    geo.geo.forEach(geoCoords => {
        var coords = geoCoords.split(",");
        geoObject.lineTo(coords[0]-geo.x, coords[1]-geo.y);
    })
    geoObject.lineTo(geo.geo[0].split(",")[0]-geo.x, geo.geo[0].split(",")[1]-geo.y);
}

function renderLevel(level) {
    //clear to prevent level "clashing"
    app.renderer.clear()
    while(this.viewport.children.length > 0){ var child = this.viewport.getChildAt(0); this.viewport.removeChild(child);}

    //sort by layers
    level.geo.sort((a, b) => a.layer - b.layer)
    level.geo.reverse()

    level.geo.forEach(geo => {
        if(geo.visible) {
            let geoObject = new PIXI.Graphics();
            geoObject.lineStyle(15, parseInt(hslToHex((geo.color+coloroffset)*45%360, 100, 50).replace('#',''), 16), 1);
            geoObject.beginFill(parseInt(hslToHex((geo.color+coloroffset)*45%360, 80, 50).replace('#',''), 16), 0.9);
            
            geoObject.x = geo.x;
            geoObject.y = geo.y;

            geoObject.interactive = true;

            renderGeo(geo, geoObject)

            //mouse-over ver with different colors
            
            geoObject.mouseOverSprite = new PIXI.Graphics();
            geoObject.mouseOverSprite.visible = false;
            geoObject.mouseOverSprite.lineStyle(15, parseInt(hslToHex((geo.color+coloroffset)*45%360, 100, 50).replace('#',''), 16), 1);
            geoObject.mouseOverSprite.beginFill(parseInt(hslToHex((geo.color+coloroffset)*45%360, 90, 50).replace('#',''), 16), 1);
            renderGeo(geo, geoObject.mouseOverSprite)

            geoObject.mouseOverSprite.x = geo.x;
            geoObject.mouseOverSprite.y = geo.y;

            geoObject.on('rightclick', () => {
                displayGeoInfo(geo)
            });
            
            geoObject.on('mouseover', () => {
                geoObject.alpha = 0; // we use alpha here because !visible doesnt allow events to be called
                geoObject.mouseOverSprite.visible = true;
            })
            geoObject.on('mouseout', () => {
                geoObject.alpha = 1; // we use alpha here because !visible doesnt allow events to be called
                geoObject.mouseOverSprite.visible = false;
            })

            this.viewport.addChild(geoObject)
            this.viewport.addChild(geoObject.mouseOverSprite)
        }
    })

    level.obj.forEach(obj => {
        let basicText = new PIXI.Text(obj.name.replace("obj",""), {
            fill: '#fff',
            fontSize: 100
        });
        basicText.x = obj.x;
        basicText.y = obj.y;

        basicText.interactive = true;

        basicText.json = obj

        this.viewport.addChild(basicText);
    })
}

function resize() {
    setTimeout(() => {
        const parent = app.view.parentElement;
        if (!parent)
            return;
        const { clientWidth: width, clientHeight: height } = parent;
        app.renderer.resize(width, height);
        this.viewport.screenWidth = width;
        this.viewport.screenHeight = height;
    }, 15) //im so sorry for this i couldnt fix it any other way
}

window.onload = function() {
    this.electron = nodeRequire ? nodeRequire("electron") : null;
    if(!this.electron) {
        document.getElementById("loading-image").innerHTML = "Sorry, but WanderComposer only runs on Electron!"
    } else {
        const electron = require('electron');
        const fs = require('fs');

        document.getElementById('button-file').onclick = () => {
            this.electron.ipcRenderer.send("openLevelFile");
        }

        let editPopup = document.getElementById('edit-popup');

        window.onclick = function(event) {
            if (event.target == editPopup) {
                editPopup.style.display = "none";
            }
        }

        //Create a Pixi Application
        app = new PIXI.Application({width: window.innerWidth, height: window.innerHeight});

        //viewport
        const Viewport = PIXI.extras.Viewport;
        this.viewport = new Viewport({
            screenWidth: window.innerWidth,
            screenHeight: window.innerHeight,
            worldWidth: 1000,
            worldHeight: 1000,
            interaction: this.interaction
        });
        
        app.renderer.backgroundColor = 0x444444;
        app.renderer.view.style.position = "absolute";
        app.renderer.view.style.display = "block";

        app.stage.addChild(this.viewport);
        viewport
            .drag()
            .pinch()
            .wheel({ smooth: 6 });

        //Add the canvas that Pixi automatically created for you to the HTML document
        document.getElementById("mapview").appendChild(app.view);

        document.addEventListener("DOMContentLoaded", resize, false);
        window.onresize = resize;
        resize(); resize(); //oh god

        electron.ipcRenderer.on("openLevelFileCB", (e, file) => {
            if(file) {
                console.log('opening level file '+file)
                fs.readFile(file[0], {encoding: 'utf8'}, (err, data) => {
                    if (err) throw err;
                    level = data.split("\n")[1];
                    renderLevel(JSON.parse(level));
                })
            } else {
                if(!level) {
                    window.close();
                }
            }
        });

        electron.ipcRenderer.send("openLevelFile");

        let i = 100;
        function loop () {
            document.getElementById('loading').style.opacity = i/100
            if(!i<=0) {
                i--;
                setTimeout(loop, 1);
            } else {
                document.getElementById('loading').style.display = 'none'
            }
        }
        loop();
    }
}