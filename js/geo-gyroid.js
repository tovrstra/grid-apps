/** Copyright 2014-2018 Stewart Allen -- All Rights Reserved */

"use strict";

var gs_base_gyroid = exports;

(function() {
    if (!self.base) self.base = {};
    if (self.base.gyroid) return;

    var base = self.base;

    let PI2 = Math.PI * 2;

    /**
     * @param off {number} z offset value from 0-1
     * @param res {number} resolution (pixels/slices per side)
     */
    function slice(off, res) {
        let rez = parseInt(res || 200);
        let inc = PI2 / rez;
        let z = PI2 * off;

        let edge = [];
        let vals = [];
        let points = 0;
        let points_lr = 0;
        let points_td = 0;
        for (let x=0; x<PI2; x += inc) {
            let vrow = []; // raw values row
            let erow = []; // edge values row
            edge.push(erow);
            vals.push(vrow);
            for (let y=0; y<PI2; y += inc) {
                erow.push(0);
                vrow.push(
                    Math.sin(x) * Math.cos(y) +
                    Math.sin(y) * Math.cos(z) +
                    Math.sin(z) * Math.cos(x)
                );
            }
        }

        // left-right threshold search (red)
        vals.forEach((vrow, y) => {
            let erow = edge[y];
            let lval = vrow[vrow.length - 1];
            vrow.forEach((val, x) => {
                if (lval <= 0 && val >= 0) {
                    erow[x] = 1;
                    points++;
                    points_lr++;
                }
                lval = val;
            })
        });

        // top-down threshold search (green)
        for (let x=0; x<rez; x++) {
            let lval = vals[vals.length-1][x];
            for (let y=0; y<rez; y++) {
                let val = vals[y][x];
                if (lval <= 0 && val >= 0) {
                    if (edge[y][x]) {
                        edge[y][x] = 3;
                    } else {
                        edge[y][x] = 2;
                        points++
                    }
                    points_td++;
                }
                lval = val;
            }
        }

        // deterime prevailing direction for chaining
        let dir = points_td > points_lr ? 'lr' : 'td';

        // create sparse representation
        let sparse = [];
        let center = rez / 2;
        edge.forEach((row,y) => {
            row.forEach((val,x) => {
                if (val) {
                    let dx = Math.abs(x - center);
                    let dy = Math.abs(y - center);
                    sparse.push({x: x/rez, y: y/rez, val, dist: Math.max(dx,dy)});
                }
            });
        });
        sparse.sort((a,b) => {
            return b.dist - a.dist;
        });

        // join sparse points array by closest distance
        let polys = [];
        let chain;
        let added;
        let cleared = 0;
        let maxdist = 0.05;

        do {
            chain = null;
            for (let i=0; i<sparse.length; i++) {
                if (sparse[i]) {
                    chain = [ sparse[i] ];
                    polys.push(chain);
                    sparse[i] = null;
                    cleared++;
                    break;
                }
            }
            do {
                added = false;
                let target = chain[chain.length - 1];
                let cl_elm = null;
                let cl_idx = null;
                let cl_dst = Infinity;
                for (let i=0; i<sparse.length; i++) {
                    let test_el = sparse[i];
                    if (test_el) {
                        let dst = dist(target, test_el, dir);
                        if (cl_idx === null || dst < cl_dst) {
                            cl_idx = i;
                            cl_elm = test_el;
                            cl_dst = dst;
                        }
                    }
                }
                if (cl_elm) {
                    if (cl_dst > maxdist) {
                        break;
                    }
                    sparse[cl_idx] = null;
                    cleared++;
                    chain.push(cl_elm);
                    added = true;
                }
            } while (added);
        } while (cleared < sparse.length);

        return {edge, points, dir, polys};
    }

    function dist(a, b, dir) {
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        // bias distance by prevailing direction of discovery to join stragglers
        if (dir === 'lr') dx = dx / 2;
        if (dir === 'td') dy = dy / 2;
        return Math.sqrt(dx * dx + dy * dy);
    }

    base.gyroid = { slice };

})();
