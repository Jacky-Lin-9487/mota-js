/* 
main.ts 游戏开始时的资源加载
*/
import * as PIXI from 'pixi.js-legacy';
import { core } from './libs/core';
import { data } from './project/data';

class Main {
    version: string;
    constructor() {
        this.version = '3.0';
        core.dom = {
            'body': document.body,
            'gameGroup': document.getElementById('gameGroup') as HTMLDivElement,
            'gameDraw': document.getElementById('gameDraw') as HTMLDivElement
        }
        core.pixi = {};
    }

    /** 开始加载游戏 */
    async load(): Promise<void> {
        // 加载project内的初始化文件
        core.floorIds = data.floorIds;
        for (let name of data.floorIds) {
            await import(`./project/floors/${name}.json`).then(floor => {
                core.floors[name] = floor;
            });
        }
        core.dataContent = data;

        // 进行全局初始化
        this.globalInit();
    }

    /** 执行全局初始化 */
    globalInit(): void {
        // 创建游戏相关pixi
        let game = new PIXI.Application({
            width: 0,
            height: 0,
            // 分辨率，不要调的过大，建议不超过4，否则会很卡
            resolution: 2,
        });
        game.renderer.view.style.position = "absolute";
        game.renderer.view.style.display = "block";
        game.view.id = 'game';
        // 如果需要调整游戏画面的宽度和高度的值请在下面调整
        game.renderer.resize(1000, 1000 / core.aspect);
        core.dom.gameDraw.appendChild(game.view);
        core.dom.game = game.view;
        core.pixi.game = game;
        core.timestamp = 0;
        core.initCore();
    }
}

let main = new Main();
export { main }