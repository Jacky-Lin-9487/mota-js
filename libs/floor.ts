import { core } from './core';
import * as block from './block';
import * as view from './view';
import * as autotile from './autotile';
import * as PIXI from 'pixi.js-legacy';
import * as enemy from '../project/functions/enemy';
import { Enemy } from './enemy';
import * as ui from './ui';

export class Floor {
    floorId: string;
    width: number;
    height: number;
    unit_width: number;
    unit_height: number;
    event: number;
    map: {
        [key: number]: number[][]
    }
    block: {
        [key: number]: { [key: string]: block.Block };
    }
    damages: {
        [key: string]: { damage?: number, critical?: number }
    }
    sprites: {
        [key: number]: { [key: string]: PIXI.DisplayObject }
    }

    constructor(floorId: string, area?: string) {
        this.floorId = floorId;
        let floor = core.floors[floorId];
        for (let one in floor) this[one] = floor[one];
        this.width = this.map[0][0].length;
        this.height = this.map[0].length;
        this.unit_width = core.__UNIT_WIDTH__;
        this.unit_height = core.__UNIT_HEIGHT__;
        this.damages = {};
        this.event = floor.eventLayer;
        this.sprites = {};
        core.status.maps[floorId] = core.status.thisMap = this;
        if (area) {
            if (!core.status.areas[area]) core.status.areas[area] = { floorIds: [], data: {} };
            let areas = core.status.areas[area];
            if (!areas.floorIds.includes(floorId)) areas.floorIds.push(floorId);
        }
    }

    /** 解析楼层 */
    extract(layer?: number): Floor {
        if (layer == void 0) {
            this.block = {};
            Object.keys(this.map).forEach(v => this.extract(parseInt(v)));
            return this;
        }
        let map: number[][] = this.map[layer];
        this.block[layer] = {};
        // 进行解析
        let h = map.length;
        let w = map[0].length;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (map[y][x] === -2 || map[y][x] === 0) continue;
                let num = map[y][x];
                let cls = core.dict[num].cls;
                let id = core.dict[num].id
                if (cls === 'enemy') this.extractEnemy(id, layer, x, y);
                if (cls === 'autotile') this.extractAutotile(num, x, y, layer);
                if (this.block[layer][x + ',' + y]) map[y][x] = -2;
            }
        }
        return this;
    }

    /** 解析某个怪物 */
    private extractEnemy(id: string, layer: number, x: number, y: number): Floor {
        if (!this.map[layer]) return this;
        let enemy = new Enemy(core.units.enemy[id], x, y, layer, this.floorId)
        let e = new block.Block(enemy, x, y);
        this.block[layer][x + ',' + y] = e;
        this.damages[x + ',' + y] = { damage: 0 };
        return this;
    }

    /** 解析某个autotile */
    private extractAutotile(number: number, x: number, y: number, layer: number): Floor {
        if (!this.map[layer]) return this;
        let tile = new autotile.Autotile(number, x, y, layer, this.floorId);
        let b = new block.Block(tile, x, y);
        this.block[layer][x + ',' + y] = b;
        return this;
    }

    /** 绘制地图 */
    draw(view?: view.View): Floor {
        if (!view) view = core.status.nowView;
        // 如果是main视角，重定位至以勇士为中心的位置
        if (view.id === 'main') view.center();
        let main = core.containers.map;
        main.scale.set(view.scale);
        main.x = -view.x;
        main.y = -view.y;
        this.extract().drawDamage();
        Object.keys(this.map).forEach(v => this.drawOneLayer(parseInt(v)));
        return this;
    }

    private drawOneLayer(layer: number): Floor {
        this.sprites[layer] = {};
        if (core.containers['_map' + layer]) core.containers['_map' + layer].destroy({ children: true });
        let container = new PIXI.Container();
        container.zIndex = layer * 10;
        core.containers['_map' + layer] = container;
        container.name = '_map' + layer;
        core.containers.map.addChild(container);
        this.drawContent(layer, container);
        return this;
    }

    /** 把地图绘制到目标container上 */
    private drawContent(layer: number, container: PIXI.Container): Floor {
        let map: number[][] = this.map[layer];
        let h: number = map.length;
        let w: number = map[0].length;
        let dict = core.dict;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let n = map[y][x];
                let nn: number
                if (n === 1 || n === 0) continue;
                // -2的数字单独处理
                if (n === -2) nn = this.block[layer][x + ',' + y].data.number;
                else nn = n;
                let cls = dict[nn].cls;
                // 开始绘制
                if (cls !== 'autotile') {
                    let animate = core.dict[nn].animate;
                    let texture = animate?.texture;
                    if (texture && animate) {
                        texture.frame = animate.data[0];
                        animate.data.now = 0;
                        this.drawOne(texture, x, y, container, nn.toString());
                    }
                } else {
                    this.drawAutotile(nn, x, y, layer, container);
                }
            }
        }
        return this;
    }

    /** 绘制单个图块到sprite */
    private drawOne(texture: PIXI.Texture, x: number, y: number, container: PIXI.Container, number: string): Floor {
        let sprite = new PIXI.Sprite(texture);
        sprite.anchor.set(0.5, 1);
        sprite.position.set(x * this.unit_width + this.unit_width / 2, y * this.unit_height + this.unit_height);
        let sx = this.unit_width / sprite.width;
        let sy = this.unit_height / sprite.height;
        if (sx > 1 && sy > 1) sprite.scale.set(Math.min(sx, sy));
        container.addChild(sprite);
        this.sprites[(container.name.match(/[0-9]+/) ?? [])[0]][x + ',' + y] = sprite;
        sprite.name = number + '@' + x + ',' + y;
        return this;
    }

    /** 绘制autotile */
    private drawAutotile(number: number, x: number, y: number, layer: number, container: PIXI.Container): Floor {
        let tile = this.block[layer][x + ',' + y].data;
        // 绘制
        tile.draw();
        return this;
    }

    /** 绘制伤害 */
    drawDamage(): Floor {
        this.sprites[-1] = {};
        let container = core.containers.damage;
        if (!container) {
            container = new PIXI.Container();
            core.containers.map.addChild(container);
            container.zIndex = Object.keys(this.map).length * 10 + 20;
            core.containers.damage = container;
            container.x = 0;
            container.y = 0;
        }
        enemy.calculateAll(this.floorId, core.status.nowHero);
        for (let loc in this.damages) {
            let [x, y] = loc.split(',');
            // 创建text
            let damage = enemy.getDamageStyle(this.damages[loc].damage ?? '???');
            let text = ui.createText(damage.damage, 2 + this.unit_width * parseInt(x), this.unit_height * (parseInt(y) + 1) - 2, 0, {
                fontSize: this.unit_width / 3, fontFamily: 'Arial', fill: damage.color, stroke: '#000000', strokeThickness: 2
            });
            text.anchor.set(0, 1);
            this.sprites[-1][loc] = text;
            ui.drawContent(container, text);
        }
        return this;
    }

    /** 获取block */
    getBlock(x: number, y: number, layer: number = this.event): block.Block {
        if (x < 0 || y < 0) throw new RangeError('获取的方块坐标不在地图范围内');
        let b = this.block[layer][x + ',' + y];
        if (b) return b;
        else {
            let dict = core.dict[this.map[layer][y][x]];
            const unit: block.defaultUnit = {
                id: dict.id, number: this.map[layer][y][x], x, y, type: dict.cls,
                floorId: this.floorId, layer, pass: dict.pass,
                trigger() {
                    return;
                },
                destroy() {
                    return;
                },
            }
            return block.generateBlock(unit);
        }
    }

    /** 移除图块 */
    removeBlock(x: number, y: number, layer: number = this.event): Floor {
        let block = this.block[layer][x + ',' + y];
        if (block) delete this.block[layer][x + ',' + y];
        this.map[layer][y][x] = 0;
        if (this.sprites[layer][x + ',' + y]) {
            this.sprites[layer][x + ',' + y].destroy();
            delete this.sprites[layer][x + ',' + y];
        }
        if (this.sprites[-1][x + ',' + y]) {
            this.sprites[-1][x + ',' + y].destroy();
            delete this.sprites[-1][x + ',' + y];
        }
        return this;
    }

    /** 是否在地图内 */
    inMap(x: number, y: number): boolean {
        return x >= 0 && y >= 0 && x < this.width && y < this.height;
    }

    /** 获取某个图块的通行情况 */
    pass(x: number, y: number, layer: number = this.event): boolean {
        if (!this.inMap(x, y)) return false;
        if (this.map[layer][y][x] === 0) return true;
        return (this.getBlock(x, y, layer) || {}).pass;
    }

    /** 是否可以前往某个图块 */
    canArrive(x: number, y: number, layer: number = this.event): boolean {
        if (!this.inMap(x, y)) return false;
        if (!this.pass(x, y, layer)) return false;
        return true;
    }
}