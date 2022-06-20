import * as enemy from '../project/functions/enemy';
import { Hero } from "./hero";
import { core } from './core';
import { Block } from './block';

export type Status = {
    readonly id: string,
    readonly number: number,
    hp: number,
    atk: number,
    def: number,
    special: number[],
    vertical?: boolean,
    useLoop?: boolean;
    [key: string]: any
}

export class Enemy {
    readonly id: string;
    readonly number: number;
    readonly type: 'enemy' = 'enemy';
    readonly floorId: string;
    destroyed: boolean = false;
    hp: number;
    atk: number;
    def: number;
    special: number[];
    vertical: boolean;
    x: number;
    y: number;
    graph: string;
    useLoop: boolean;
    damage: enemy.Damage;
    block: Block;
    layer: number;
    [key: string]: any;

    constructor(status: Status, x: number, y: number, layer: number, floorId: string) {
        for (let one in status) {
            this[one] = status[one];
        }
        if (!status.useLoop) this.useLoop = false;
        this.x = x;
        this.y = y;
        this.floorId = floorId;
        this.layer = layer;
    }

    /** 获得该怪物的伤害信息 */
    getDamage(hero: string | Hero): enemy.Damage {
        return enemy.getDamage(this.floor, hero, this.x, this.y, {});
    }

    /** 触发战斗触发器 */
    trigger(): Enemy {
        return this.battle();
    }

    /** 战斗 */
    private battle(): Enemy {
        let hero = core.status.nowHero
        let damage = this.getDamage(hero);
        this.damage = damage;
        // 扣血并删除当前图块
        hero.addStatus('hp', -damage.damage);
        if (this.block) this.block.destroy(true);
        else this.destroy();
        return this;
    }

    /** 销毁这个怪物 */
    destroy(): void {
        this.destroyed = true;
    }
}