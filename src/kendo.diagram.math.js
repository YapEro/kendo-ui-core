kendo_module({
    id: "diagram.math",
    name: "Math",
    category: "diagram",
    depends: ["dataviz.core"]
});

(function ($, undefined) {
    var kendo = window.kendo,
        diagram = kendo.diagram = {},
        Graph = kendo.diagram.Graph,
        Node = kendo.diagram.Node,
        Link = kendo.diagram.Link,
        Dictionary = kendo.diagram.Dictionary,
        HashTable = kendo.diagram.HashTable,
        Queue = kendo.diagram.Queue,
        Set = kendo.diagram.Set,
        Class = kendo.Class,
        deepExtend = kendo.deepExtend,
        dataviz = kendo.dataviz,
        HITTESTAREA = 3,
        Point = dataviz.Point2D,
        EPSILON = 1e-06;

    deepExtend(Point.fn, {
        plus: function (p) {
            return new Point(this.x + p.x, this.y + p.y);
        },
        minus: function (p) {
            return new Point(this.x - p.x, this.y - p.y);
        },
        offset: function (value) {
            return new Point(this.x - value, this.y - value);
        },
        times: function (s) {
            return new Point(this.x * s, this.y * s);
        },
        normalize: function () {
            if (this.length() == 0) {
                return new Point();
            }
            return this.times(1 / this.length());
        },
        length: function () {
            return Math.sqrt(this.x * this.x + this.y * this.y);
        },
        toString: function () {
            return "(" + this.x + "," + this.y + ")";
        },
        lengthSquared: function () {
            return (this.x * this.x + this.y * this.y);
        },
        middleOf: function MiddleOf(p, q) {
            return new Point(q.x - p.x, q.y - p.y).times(0.5).plus(p);
        },
        toPolar: function (useDegrees) {
            var factor = 1;
            if (useDegrees) {
                factor = 180 / Math.PI;
            }
            var a = Math.atan2(Math.abs(this.y), Math.abs(this.x));
            var halfpi = Math.PI / 2;
            if (this.x == 0) {
                // note that the angle goes down and not the usual mathematical convention
                var len = this.length();
                if (this.y == 0) {
                    return new Polar(0, 0);
                }
                if (this.y > 0) {
                    return new Polar(len, factor * halfpi);
                }
                if (this.y < 0) {
                    return new Polar(len, factor * 3 * halfpi);
                }
            }
            else if (this.x > 0) {
                if (this.y == 0) {
                    return new Polar(len, 0);
                }
                if (this.y > 0) {
                    return new Polar(len, factor * a);
                }
                if (this.y < 0) {
                    return new Polar(len, factor * (4 * halfpi - a));
                }
            }
            else {
                if (this.y == 0) {
                    return new Polar(len, 2 * halfpi);
                }
                if (this.y > 0) {
                    return new Polar(len, factor * (2 * halfpi - a));
                }
                if (this.y < 0) {
                    return new Polar(len, factor * (2 * halfpi + a));
                }
            }
        },
        isOnLine: function (from, to) {
            if (from.x > to.x) { // from must be the leftmost point
                var temp = to;
                to = from;
                from = temp;
            }
            var r1 = new Rect(from.x, from.y).inflate(HITTESTAREA, HITTESTAREA),
                r2 = new Rect(to.x, to.y).inflate(HITTESTAREA, HITTESTAREA);
            if (r1.union(r2).contains(this)) {
                if (from.x === to.x || from.y === to.y) {
                    return true;
                }
                else if (from.y < to.y) {
                    o1 = r1.x + (((r2.x - r1.x) * (this.y - (r1.y + r1.height))) / ((r2.y + r2.height) - (r1.y + r1.height)));
                    u1 = (r1.x + r1.width) + ((((r2.x + r2.width) - (r1.x + r1.width)) * (this.y - r1.y)) / (r2.y - r1.y));
                }
                else {
                    o1 = r1.x + (((r2.x - r1.x) * (this.y - r1.y)) / (r2.y - r1.y));
                    u1 = (r1.x + r1.width) + ((((r2.x + r2.width) - (r1.x + r1.width)) * (this.y - (r1.y + r1.height))) / ((r2.y + r2.height) - (r1.y + r1.height)));
                }
                return (this.x > o1 && this.x < u1);
            }
            return false;
        }
    });

    var Rect = Class.extend({
        init: function (x, y, width, height) {
            this.x = x || 0;
            this.y = y || 0;
            this.width = width || 0;
            this.height = height || 0;
        },
        contains: function (point) {
            return ((point.x >= this.x) && (point.x <= (this.x + this.width)) && (point.y >= this.y) && (point.y <= (this.y + this.height)));
        },
        inflate: function (dx, dy) {
            if (dy === undefined) {
                dy = dx;
            }

            this.x -= dx;
            this.y -= dy;
            this.width += 2 * dx + 1;
            this.height += 2 * dy + 1;
            return this;
        },
        offset: function (dx, dy) {
            this.x += dx;
            this.y += dy;
        },
        union: function (r) {
            var x1 = Math.min(this.x, r.x);
            var y1 = Math.min(this.y, r.y);
            var x2 = Math.max((this.x + this.width), (r.x + r.width));
            var y2 = Math.max((this.y + this.height), (r.y + r.height));
            return new Rect(x1, y1, x2 - x1, y2 - y1);
        },
        center: function () {
            return new Point(this.x + this.width / 2, this.y + this.height / 2);
        },
        top: function () {
            return new Point(this.x + this.width / 2, this.y);
        },
        right: function () {
            return new Point(this.x + this.width, this.y + this.height / 2);
        },
        bottom: function () {
            return new Point(this.x + this.width / 2, this.y + this.height);
        },
        left: function () {
            return new Point(this.x, this.y + this.height / 2);
        },
        topLeft: function () {
            return new Point(this.x, this.y);
        },
        topRight: function () {
            return new Point(this.x + this.width, this.y);
        },
        bottomLeft: function () {
            return new Point(this.x, this.y + this.height);
        },
        bottomRight: function () {
            return new Point(this.x + this.width, this.y + this.height);
        },
        clone: function () {
            return new Rect(this.x, this.y, this.width, this.height);
        },
        empty: function () {
            return new Rect(0, 0, 0, 0);
        },
        isEmpty: function () {
            return !this.width && !this.height;
        },
        fromPoints: function (p, q) {
            if (isNaN(p.x) || isNaN(p.y) || isNaN(q.x) || isNaN(q.y)) {
                throw "Some values are NaN.";
            }
            return new Rect(Math.min(p.x, q.x), Math.min(p.y, q.y), Math.abs(p.x - q.x), Math.abs(p.y - q.y));
        },
        equals: function (rect) {
            return this.x == rect.x && this.y === rect.y && this.width === rect.width && this.height === rect.height;
        },
        toString: function () {
            return this.x + " " + this.y + " " + this.width + " " + this.height;
        }
    });

    var Size = Class.extend({
        init: function (width, height) {
            this.width = width;
            this.height = height;
        }
    });

    Size.prototype.Empty = new Size(0, 0);

    Rect.toRect = function (rect) {
        if (!(rect instanceof Rect)) {
            rect = new Rect(rect.x, rect.y, rect.width, rect.height);
        }

        return rect;
    };

    function isNearZero(num) {
        return Math.abs(num) < EPSILON;
    }

    function intersectLine(start1, end1, start2, end2, isSegment) {
        var tangensdiff = ((end1.x - start1.x) * (end2.y - start2.y)) - ((end1.y - start1.y) * (end2.x - start2.x));
        if (isNearZero(tangensdiff)) {
            //parallel lines
            return;
        }

        var num1 = ((start1.y - start2.y) * (end2.x - start2.x)) - ((start1.x - start2.x) * (end2.y - start2.y));
        var num2 = ((start1.y - start2.y) * (end1.x - start1.x)) - ((start1.x - start2.x) * (end1.y - start1.y));
        var r = num1 / tangensdiff;
        var s = num2 / tangensdiff;

        if (isSegment && (r < 0 || r > 1 || s < 0 || s > 1)) {
            //r < 0 => line 1 is below line 2
            //r > 1 => line 1 is above line 2
            //s < 0 => line 2 is below line 1
            //s > 1 => line 2 is above line 1
            return;
        }

        return new Point(start1.x + (r * (end1.x - start1.x)), start1.y + (r * (end1.y - start1.y)));
    }

    var Intersect = {
        lines: function (start1, end1, start2, end2) {
            return intersectLine(start1, end1, start2, end2);
        },
        segments: function (start1, end1, start2, end2) {
            return intersectLine(start1, end1, start2, end2, true);
        },
        rectWithLine: function (rect, start, end) {
            return  Intersect.segments(start, end, rect.topLeft(), rect.topRight()) ||
                Intersect.segments(start, end, rect.topRight(), rect.bottomRight()) ||
                Intersect.segments(start, end, rect.bottomLeft(), rect.bottomRight()) ||
                Intersect.segments(start, end, rect.topLeft(), rect.bottomLeft());
        },
        rects: function (rect1, rect2, angle) {
            var tl = rect2.topLeft(),
                tr = rect2.topRight(),
                bl = rect2.bottomLeft(),
                br = rect2.bottomRight();

            if (angle) {
                var center = rect2.center();
                tl = tl.rotate(center, angle);
                tr = tr.rotate(center, angle);
                bl = bl.rotate(center, angle);
                br = br.rotate(center, angle);
            }

            var intersect = rect1.contains(tl) ||
                rect1.contains(tr) ||
                rect1.contains(bl) ||
                rect1.contains(br) ||
                Intersect.rectWithLine(rect1, tl, tr) ||
                Intersect.rectWithLine(rect1, tl, bl) ||
                Intersect.rectWithLine(rect1, tr, br) ||
                Intersect.rectWithLine(rect1, bl, br);

            if (!intersect) {//last possible case is rect1 to be completely within rect2
                tl = rect1.topLeft();
                tr = rect1.topRight();
                bl = rect1.bottomLeft();
                br = rect1.bottomRight();

                if (angle) {
                    var reverseAngle = 360 - angle;
                    tl = tl.rotate(center, reverseAngle);
                    tr = tr.rotate(center, reverseAngle);
                    bl = bl.rotate(center, reverseAngle);
                    br = br.rotate(center, reverseAngle);
                }

                intersect = rect2.contains(tl) ||
                    rect2.contains(tr) ||
                    rect2.contains(bl) ||
                    rect2.contains(br);
            }

            return intersect;
        }
    };

    /**
     * Aligns two rectangles, where one is the container and the other is content.
     */
    var RectAlign = Class.extend({
        init: function (container) {
            this.container = Rect.toRect(container);
        },

        align: function (content, alignment) {
            var alignValues = alignment.toLowerCase().split(" ");

            for (var i = 0; i < alignValues.length; i++) {
                content = this._singleAlign(content, alignValues[i]);
            }

            return content;
        },
        _singleAlign: function (content, alignment) {
            if (isFunction(this[alignment])) {
                return this[alignment](content);
            }
            else {
                return content;
            }
        },

        left: function (content) {
            return this._hAlign(content, this._left);
        },
        center: function (content) {
            return this._hAlign(content, this._center);
        },
        right: function (content) {
            return this._hAlign(content, this._right);
        },
        top: function (content) {
            return this._vAlign(content, this._top);
        },
        middle: function (content) {
            return this._vAlign(content, this._middle);
        },
        bottom: function (content) {
            return this._vAlign(content, this._bottom);
        },

        _left: function (container, content) {
            return container.x;
        },
        _center: function (container, content) {
            return ((container.width - content.width) / 2) | 0;
        },
        _right: function (container, content) {
            return container.width - content.width;
        },
        _top: function (container, content) {
            return container.y
        },
        _middle: function (container, content) {
            return ((container.height - content.height) / 2) | 0;
        },
        _bottom: function (container, content) {
            return container.height - content.height;
        },

        _hAlign: function (content, alignCalc) {
            content = Rect.toRect(content);
            content.x = alignCalc(this.container, content);

            return content;
        },
        _vAlign: function (content, alignCalc) {
            content = Rect.toRect(content);
            content.y = alignCalc(this.container, content);

            return content;
        }
    });

    var Polar = Class.extend({
        init: function (r, a) {
            this.r = r;
            this.angle = a;
        }
    });

    /**
     * SVG transformation matrix.
     */
    var Matrix = Class.extend({
        init: function (a, b, c, d, e, f) {
            this.a = a || 0;
            this.b = b || 0;
            this.c = c || 0;
            this.d = d || 0;
            this.e = e || 0;
            this.f = f || 0;
        },
        plus: function (m) {
            this.a += m.a;
            this.b += m.b;
            this.c += m.c;
            this.d += m.d;
            this.e += m.e;
            this.f += m.f;
        },
        minus: function (m) {
            this.a -= m.a;
            this.b -= m.b;
            this.c -= m.c;
            this.d -= m.d;
            this.e -= m.e;
            this.f -= m.f;
        },
        times: function (m) {
            return new Matrix(
                this.a * m.a + this.c * m.b,
                this.b * m.a + this.d * m.b,
                this.a * m.c + this.c * m.d,
                this.b * m.c + this.d * m.d,
                this.a * m.e + this.c * m.f + this.e,
                this.b * m.e + this.d * m.f + this.f
            );
        },
        apply: function (p) {
            return new Point(this.a * p.x + this.c * p.y + this.e, this.b * p.x + this.d * p.y + this.f);
        },
        toString: function () {
            return "matrix(" + this.a + " " + this.b + " " + this.c + " " + this.d + " " + this.e + " " + this.f + ")";
        }
    });

    deepExtend(Matrix, {
        fromSVGMatrix: function (vm) {
            var m = new Matrix();
            m.a = vm.a;
            m.b = vm.b;
            m.c = vm.c;
            m.d = vm.d;
            m.e = vm.e;
            m.f = vm.f;
            return m;
        },
        fromMatrixVector: function (v) {
            var m = new Matrix();
            m.a = v.a;
            m.b = v.b;
            m.c = v.c;
            m.d = v.d;
            m.e = v.e;
            m.f = v.f;
            return m;
        },
        fromList: function (v) {
            if (v.length != 6) {
                throw "The given list should consist of six elements.";
            }
            var m = new Matrix();
            m.a = v[0];
            m.b = v[1];
            m.c = v[2];
            m.d = v[3];
            m.e = v[4];
            m.f = v[5];
            return m;
        },
        translation: function (x, y) {
            var m = new Matrix();
            m.a = 1;
            m.b = 0;
            m.c = 0;
            m.d = 1;
            m.e = x;
            m.f = y;
            return m;
        },
        unit: function () {
            return new Matrix(1, 0, 0, 1, 0, 0);
        },
        rotation: function (angle, x, y) {
            var m = new Matrix();
            m.a = Math.cos(angle * Math.PI / 180);
            m.b = Math.sin(angle * Math.PI / 180);
            m.c = -m.b;
            m.d = m.a;
            m.e = (x - x * m.a + y * m.b) || 0;
            m.f = (y - y * m.a - x * m.b) || 0;
            return m;
        },
        scaling: function (scaleX, scaleY) {
            var m = new Matrix();
            m.a = scaleX;
            m.b = 0;
            m.c = 0;
            m.d = scaleY;
            m.e = 0;
            m.f = 0;
            return m;
        },
        parse: function (v) {
            var parts, nums;
            if (v) {
                v = v.trim();
                // of the form "matrix(...)"
                if (v.slice(0, 6).toLowerCase() == "matrix") {
                    nums = v.slice(7, v.length - 1).trim();
                    parts = nums.split(",");
                    if (parts.length == 6) {
                        return Matrix.fromList(parts.map(function (p) {
                            return parseFloat(p);
                        }));
                    }
                    parts = nums.split(" ");
                    if (parts.length == 6) {
                        return Matrix.fromList(parts.map(function (p) {
                            return parseFloat(p);
                        }));
                    }
                }
                // of the form "(...)"
                if (v.slice(0, 1) == "(" && v.slice(v.length - 1) == ")") {
                    v = v.substr(1, v.length - 1);
                }
                if (v.indexOf(",") > 0) {
                    parts = v.split(",");
                    if (parts.length == 6) {
                        return Matrix.fromList(parts.map(function (p) {
                            return parseFloat(p);
                        }));
                    }
                }
                if (v.indexOf(" ") > 0) {
                    parts = v.split(" ");
                    if (parts.length == 6) {
                        return Matrix.fromList(parts.map(function (p) {
                            return parseFloat(p);
                        }));
                    }
                }
            }
            return parts;
        }
    });

    /**
     * SVG transformation represented as a vector.
     */
    var MatrixVector = Class.extend({
        init: function (a, b, c, d, e, f) {
            this.a = a || 0;
            this.b = b || 0;
            this.c = c || 0;
            this.d = d || 0;
            this.e = e || 0;
            this.f = f || 0;
        },
        fromMatrix: function FromMatrix(m) {
            var v = new MatrixVector();
            v.a = m.a;
            v.b = m.b;
            v.c = m.c;
            v.d = m.d;
            v.e = m.e;
            v.f = m.f;
            return v;
        }
    });

    /**
     * The Range defines an array of equally separated numbers.
     * @param start The start-value of the Range.
     * @param stop The end-value of the Range.
     * @param step The separation between the values (default:1).
     * @returns {Array}
     */
    function Range(start, stop, step) {
        if (typeof start == 'undefined' || typeof stop == 'undefined') {
            return [];
        }
        if (step && Math.sign(stop - start) != Math.sign(step)) {
            throw "The sign of the increment should allow to reach the stop-value.";
        }
        step = step || 1;
        start = start || 0;
        stop = stop || start;
        if ((stop - start) / step === Infinity) {
            throw "Infinite range defined.";
        }
        var range = [], i = -1, j;

        function rangeIntegerScale(x) {
            var k = 1;
            while (x * k % 1) {
                k *= 10;
            }
            return k;
        }

        var k = rangeIntegerScale(Math.abs(step));
        start *= k;
        stop *= k;
        step *= k;
        if (start > stop && step > 0) {
            step = -step;
        }
        if (step < 0) {
            while ((j = start + step * ++i) >= stop) {
                range.push(j / k);
            }
        }
        else {
            while ((j = start + step * ++i) <= stop) {
                range.push(j / k);
            }
        }
        return range;
    }

    /**
     * Returns a value with Gaussian (normal) distribution.
     * @param mean The mean value of the distribution.
     * @param deviation The deviation (spreading at half-height) of the distribution.
     * @returns {number}
     */
    function normalVariable(mean, deviation) {
        var x, y, r;
        do {
            x = Math.random() * 2 - 1;
            y = Math.random() * 2 - 1;
            r = x * x + y * y;
        }
        while (!r || r > 1);
        return mean + deviation * x * Math.sqrt(-2 * Math.log(r) / r);
    };

    /**
     * Returns a random identifier which can be used as an ID of objects, eventually augmented with a prefix.
     * @returns {string}
     */
    function randomId(length) {
        if (isUndefined(length)) {
            length = 10;
        }
        // old version return Math.floor((1 + Math.random()) * 0x1000000).toString(16).substring(1);
        var result = '';
        var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for (var i = length; i > 0; --i) {
            result += chars[Math.round(Math.random() * (chars.length - 1))];
        }
        return result;
    }

    /*---------------The HashTable structure--------------------------------*/

    /**
     * Represents a collection of key-value pairs that are organized based on the hash code of the key.
     * _buckets[hashId] = {key: key, value:...}
     * Important: do not use the standard Array access method, use the get/set methods instead.
     * See http://en.wikipedia.org/wiki/Hash_table
     */
    var HashTable = kendo.Class.extend({
        init: function () {
            this._buckets = [];
            this.length = 0;
        },

        /**
         * Adds the literal object with the given key (of the form {key: key,....}).
         */
        add: function (key, value) {

            var obj = this._createGetBucket(key);
            if (isDefined(value)) {
                obj.value = value;
            }
            return obj;
        },

        /**
         * Gets the literal object with the given key.
         */
        get: function (key) {
            if (this._bucketExists(key)) {
                return this._createGetBucket(key);
            }
            return null;
        },

        /**
         * Set the key-value pair.
         * @param key The key of the entry.
         * @param value The value to set. If the key already exists the value will be overwritten.
         */
        set: function (key, value) {
            this.add(key, value);
        },

        /**
         * Determines whether the HashTable contains a specific key.
         */
        containsKey: function (key) {
            return this._bucketExists(key);
        },

        /**
         * Removes the element with the specified key from the hashtable.
         * Returns the removed bucket.
         */
        remove: function (key) {
            if (this._bucketExists(key)) {
                var hashId = this._hash(key);
                delete this._buckets[hashId];
                this.length--;
                return key;
            }
        },

        /**
         * Foreach with an iterator working on the key-value pairs.
         * @param func
         */
        forEach: function (func) {
            var hashes = this._hashes();
            for (var i = 0, len = hashes.length; i < len; i++) {
                var hash = hashes[i];
                var bucket = this._buckets[hash];
                if (isUndefined(bucket)) {
                    continue;
                }
                func(bucket);
            }
        },

        /**
         * Returns a (shallow) clone of the current HashTable.
         * @returns {HashTable}
         */
        clone: function(){
            var ht = new HashTable();
            var hashes = this._hashes();
            for (var i = 0, len = hashes.length; i < len; i++) {
                var hash = hashes[i];
                var bucket = this._buckets[hash];
                if (isUndefined(bucket)) {
                    continue;
                }
                ht.add(bucket.key,bucket.value);
            }
            return ht;
        },

        /**
         * Returns the hashes of the buckets.
         * @returns {Array}
         * @private
         */
        _hashes: function() {
            var hashes = [];
            for (var hash in this._buckets) {
                if (this._buckets.hasOwnProperty(hash)) {
                    hashes.push(hash);
                }
            }
            return hashes;
        },

        _bucketExists: function(key) {
            var hashId = this._hash(key);
            return isDefined(this._buckets[hashId]);
        },

        /**
         * Returns-adds the createGetBucket with the given key. If not present it will
         * be created and returned.
         * A createGetBucket is a literal object of the form {key: key, ...}.
         */
        _createGetBucket: function(key) {
            var hashId = this._hash(key);
            var bucket = this._buckets[hashId];
            if (isUndefined(bucket)) {
                bucket = { key: key };
                this._buckets[hashId] = bucket;
                this.length++;
            }
            return bucket;
        },

        /**
         * Hashing of the given key.
         */
        _hash: function(key) {
            if (isNumber(key)) {
                return key & key;
            }
            if (isString(key)) {
                return this._hashString(key);
            }
            if (isObject(key)) {
                return this._objectHashId(key);
            }
            throw "Unsupported key type.";
        },

        /**
         * Hashing of a string.
         */
        _hashString: function (s) {
            // see for example http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
            var result = 0;
            if (s.length == 0) {
                return result;
            }
            for (var i = 0; i < s.length; i++) {
                var ch = s.charCodeAt(i);
                result = ((result << 5) - result) + ch;
                result = result & result;
            }
            return result;
        },

        /**
         * Returns the unique identifier for an object. This is automatically assigned and add on the object.
         */
        _objectHashId: function (key) {
            var id = key._hashId;
            if (isUndefined(id)) {
                id = randomId();
                key._hashId = id;
            }
            return id;
        }
    });

    /*---------------The Dictionary structure--------------------------------*/

    /**
     * Represents a collection of key-value pairs.
     * Important: do not use the standard Array access method, use the get/Set methods instead.
     */
    var Dictionary = kendo.Observable.extend({
        /**
         * Initializes a new instance of the Dictionary class.
         * @param dictionary Loads the content of the given dictionary into this new one.
         */
        init: function (dictionary) {
            var that = this;
            kendo.Observable.fn.init.call(that);
            that.bind('changed', function (e) {
            });
            this._hashTable = new HashTable();
            this.length = 0;
            if (isDefined(dictionary)) {
                dictionary.forEach(function (k, v) {
                    this.add(k, v);
                }, this);
            }
        },

        /**
         * Adds a key-value to the dictionary.
         * If the key already exists this will assign the given value to the existing entry.
         */
        add: function (key, value) {
            var entry = this._hashTable.get(key);
            if (entry == null) {
                entry = this._hashTable.add(key);
                this.length++;
                this.trigger('changed');
            }
            entry.value = value;
        },

        /**
         * Set the key-value pair.
         * @param key The key of the entry.
         * @param value The value to set. If the key already exists the value will be overwritten.
         */
        set: function (key, value) {
            this.add(key, value);
        },

        /**
         * Gets the value associated with the given key in the dictionary.
         */
        get: function (key) {
            var entry = this._hashTable.get(key);
            if (entry != null) {
                return entry.value;
            }
            throw new Error("Cannot find key " + key);
        },

        /**
         * Returns whether the dictionary contains the given key.
         */
        containsKey: function (key) {
            return this._hashTable.containsKey(key);
        },

        /**
         * Removes the element with the specified key from the dictionary.
         */
        remove: function (key) {
            if (this.containsKey(key)) {
                this.trigger("changed");
                return this._hashTable.remove(key);
                this.length--;
            }
        },

        /**
         * The functional gets the key and value as parameters.
         */
        forEach: function (func, thisRef) {
            this._hashTable.forEach(function (entry) {
                func.call(thisRef, entry.key, entry.value);
            });
        },

        /**
         * Same as forEach except that only the value is passed to the functional.
         */
        forEachValue: function (func, thisRef) {
            this._hashTable.forEach(function (entry) {
                func.call(thisRef, entry.value);
            });
        },

        /**
         * Calls a defined callback function for each key in the dictionary.
         */
        forEachKey: function (func, thisRef) {
            this._hashTable.forEach(function (entry) {
                func.call(thisRef, entry.key);
            });
        },

        /**
         * Gets an array with all keys in the dictionary.
         */
        keys: function () {
            var keys = [];
            this.forEachKey(function (key) {
                keys.push(key);
            });
            return keys;
        }
    });

    /*---------------Queue structure--------------------------------*/

    var Queue = kendo.Class.extend({

        init: function () {
            this._tail = null;
            this._head = null;
            this.length = 0;
        },

        /**
         * Enqueues an object to the end of the queue.
         */
        enqueue: function (value) {
            var entry = { value: value, next: null };
            if (this._head == null) {
                this._head = entry;
                this._tail = this._head;
            }
            else {
                this._tail.next = entry;
                this._tail = this._tail.next;
            }
            this.length++;
        },

        /**
         * Removes and returns the object at top of the queue.
         */
        dequeue: function () {
            if (this.length < 1) {
                throw new Error("The queue is empty.");
            }
            var value = this._head.value;
            this._head = this._head.next;
            this.length--;
            return value;
        },

        contains: function (item) {
            var current = this._head;
            while (current != null) {
                if (current.value == item) {
                    return true;
                }
                current = current.next;
            }
            return false;
        }
    });


    /**
     * While other data structures can have multiple times the same item a Set owns only
     * once a particular item.
     * @type {*}
     */
    var Set = kendo.Observable.extend({
        init: function (resource) {
            var that = this;
            kendo.Observable.fn.init.call(that);
            that.bind('changed', function (e) {
            });
            this._hashTable = new HashTable();
            this.length = 0;
            if (isDefined(resource)) {
                if (resource instanceof HashTable) {
                    resource.forEach(function (d) {
                        this.add(d);
                    })
                }
                else if (resource instanceof Dictionary) {
                    resource.forEach(function (k, v) {
                        this.add({key: k, value: v});
                    }, this)
                }
            }
        },

        contains: function (item) {
            return this._hashTable.containsKey(item);
        },

        add: function (item) {
            var entry = this._hashTable.get(item);
            if (entry == null) {
                this._hashTable.add(item, item);
                this.length++;
                this.trigger('changed');
            }
        },

        get: function (item) {
            if(this.contains(item))
            return this._hashTable.get(item).value;
            else
            return null;
        },

        /**
         * Returns the hash of the item.
         * @param item
         * @returns {*}
         */
        hash : function (item) {
             return this._hashTable._hash(item);
        }   ,

        /**
         * Removes the given item from the set. No exception is thrown if the item is not in the Set.
         * @param item
         */
        remove: function (item) {
            if (this.contains(item)) {
                this._hashTable.remove(item);
                this.length--;
                this.trigger('changed');
            }
        },
        /**
         * Foreach with an iterator working on the key-value pairs.
         * @param func
         */
        forEach: function (func, context) {
            this._hashTable.forEach(function (kv) {
                func(kv.value);
            }, context);
        },
        toArray: function () {
            var r = [];
            this.forEach(function (d) {
                r.push(d);
            });
            return r;
        }
    });

    /*----------------Node-------------------------------*/

    /**
     * Defines the node (vertex) of a Graph.
     */
    var Node = kendo.Class.extend({

        init: function (id, shape) {

            /**
             * Holds all the links incident with the current node.
             * Do not use this property to manage the incoming links, use the appropriate add/remove methods instead.
             */
            this.links = [];

            /**
             * Holds the links from the current one to another Node .
             * Do not use this property to manage the incoming links, use the appropriate add/remove methods instead.
             */
            this.outgoing = [];

            /**
             * Holds the links from another Node to the current one.
             * Do not use this property to manage the incoming links, use the appropriate add/remove methods instead.
             */
            this.incoming = [];

            /**
             * Holds the weight of this Node.
             */
            this.weight = 1;

            if (isDefined(id)) {
                this.id = id;
            }
            else {
                this.id = randomId();
            }
            if (isDefined(shape)) {
                this.associatedShape = shape;
                // transfer the shape's bounds to the runtime props
                var b = shape.bounds();
                this.width = b.width;
                this.height = b.height;
                this.x = b.x;
                this.y = b.y;
            }
            else {
                this.associatedShape = null;
            }
            /**
             * The payload of the node.
             * @type {null}
             */
            this.data = null;
            this.type = "Node";
            this.shortForm = "Node '" + this.id + "'";
            /**
             * Whether this is an injected node during the analysis or layout process.
             * @type {boolean}
             */
            this.isVirtual = false;
        },

        /**
         * Returns whether this node has no links attached.
         */
        isIsolated: function () {
            return this.links.isEmpty();
        },

        /**
         * Gets or sets the bounding rectangle of this node.
         * This should be considered as runtime data, the property is not hotlinked to a SVG item.
         */
        bounds: function (r) {
            if (!isDefined(r)) {
                return new diagram.Rect(this.x, this.y, this.width, this.height);
            }

            this.x = r.x;
            this.y = r.y;
            this.width = r.width;
            this.height = r.height;
        },

        /**
         * Returns whether there is at least one link with the given (complementary) node. This can be either an
         * incoming or outgoing link.
         */
        isLinkedTo: function (node) {
            var thisRef = this;
            return this.links.any(function (link) {
                return link.getComplement(thisRef) === node;
            });
        },

        /**
         * Gets the children of this node, defined as the adjacent nodes with a link from this node to the adjacent one.
         * @returns {Array}
         */
        getChildren: function () {
            if (this.outgoing.length == 0) {
                return [];
            }
            var children = [];
            for (var i = 0, len = this.outgoing.length; i < len; i++) {
                var link = this.outgoing[i];
                children.add(link.getComplement(this));
            }
            return children;
        },

        /**
         * Gets the parents of this node, defined as the adjacent nodes with a link from the adjacent node to this one.
         * @returns {Array}
         */
        getParents: function () {
            if (this.incoming.length == 0) {
                return [];
            }
            var parents = [];
            for (var i = 0, len = this.incoming.length; i < len; i++) {
                var link = this.incoming[i];
                parents.add(link.getComplement(this));
            }
            return parents;
        },

        /**
         * Returns a clone of the Node. Note that the identifier is not cloned since it's a different Node instance.
         * @returns {Node}
         */
        clone: function () {
            var copy = new Node();
            if (isDefined(this.weight)) {
                copy.weight = this.weight;
            }
            if (isDefined(this.balance)) {
                copy.balance = this.balance;
            }
            if (isDefined(this.owner)) {
                copy.owner = this.owner;
            }
            copy.associatedShape = this.associatedShape;
            copy.x = this.x;
            copy.y = this.y;
            copy.width = this.width;
            copy.height = this.height;
            return copy;
        },

        /**
         * Returns whether there is a link from the current node to the given node.
         */
        adjacentTo: function (node) {
            return this.isLinkedTo(node) !== null;
        },

        /**
         * Removes the given link from the link collection this node owns.
         * @param link
         */
        removeLink: function (link) {
            if (link.source == this) {
                this.links.remove(link);
                this.outgoing.remove(link);
                link.source = null;
            }

            if (link.target == this) {
                this.links.remove(link);
                this.incoming.remove(link);
                link.target = null;
            }
        },

        /**
         * Returns whether there is a (outgoing) link from the current node to the given one.
         */
        hasLinkTo: function (node) {
            return this.outgoing.any(function (link) {
                return link.target == node;
            });
        },

        /**
         * Returns the degree of this node, i.e. the sum of incoming and outgoing links.
         */
        degree: function () {
            return this.links.length;
        },

        /**
         * Returns whether this node is either the source or the target of the given link.
         */
        incidentWith: function (link) {
            return this.links.contains(link);
        },

        /**
         * Returns the links between this node and the given one.
         */
        getLinksWith: function (node) {
            return this.links.all(function (link) {
                return link.getComplement(this) === node;
            }, this);
        },

        /**
         * Returns the nodes (either parent or child) which are linked to the current one.
         */
        getNeighbors: function () {
            var neighbors = [];
            this.incoming.forEach(function (e) {
                neighbors.push(e.getComplement(this));
            }, this);
            this.outgoing.forEach(function (e) {
                neighbors.push(e.getComplement(this));
            }, this);
            return neighbors;
        }
    });

    /**
     * Defines a directed link (edge, connection) of a Graph.
     */
    var Link = kendo.Class.extend({

        init: function (source, target, id, connection) {
            if (isUndefined(source)) {
                throw "The source of the new link is not set.";
            }
            if (isUndefined(target)) {
                throw "The target of the new link is not set.";
            }
            var sourceFound, targetFound;
            if (isString(source)) {
                sourceFound = new Node(source);
            }
            else {
                sourceFound = source;
            }
            if (isString(target)) {
                targetFound = new Node(target);
            }
            else {
                targetFound = target;
            }

            this.source = sourceFound;
            this.target = targetFound;
            this.source.links.add(this);
            this.target.links.add(this);
            this.source.outgoing.add(this);
            this.target.incoming.add(this);
            if (isDefined(id)) {
                this.id = id;
            }
            else {
                this.id = randomId();
            }
            if (isDefined(connection)) {
                this.associatedConnection = connection;
            }
            else {
                this.associatedConnection = null;
            }
            this.type = "Link";
            this.shortForm = "Link '" + this.source.id + "->" + this.target.id + "'";
        },

        /**
         * Returns the complementary node of the given one, if any.
         */
        getComplement: function (node) {
            if (this.source != node && this.target != node) {
                throw "The given node is not incident with this link.";
            }
            return this.source == node ? this.target : this.source;
        },

        /**
         * Returns the overlap of the current link with the given one, if any.
         */
        getCommonNode: function (link) {
            if (this.source == link.source || this.source == link.target) {
                return this.source;
            }
            if (this.target == link.source || this.target == link.target) {
                return this.target;
            }
            return null;
        },

        /**
         * Returns whether the current link is bridging the given nodes.
         */
        isBridging: function (v1, v2) {
            return this.source == v1 && this.target == v2 || this.source == v2 && this.target == v1;
        },

        /**
         * Returns the source and target of this link as a tuple.
         */
        getNodes: function () {
            return [this.source, this.target];
        },

        /**
         * Returns whether the given node is either the source or the target of the current link.
         */
        incidentWith: function (node) {
            return this.source == node || this.target == node;
        },

        /**
         * Returns whether the given link is a continuation of the current one. This can be both
         * via an incoming or outgoing link.
         */
        adjacentTo: function (link) {
            return this.source.links.contains(link) || this.target.links.contains(link);
        },

        /**
         * Changes the source-node of this link.
         */
        changeSource: function (node) {
            this.source.links.remove(this);
            this.source.outgoing.remove(this);

            node.links.push(this);
            node.outgoing.push(this);

            this.source = node;
        },

        /**
         * Changes the target-node of this link.
         * @param node
         */
        changeTarget: function (node) {
            this.target.links.remove(this);
            this.target.incoming.remove(this);

            node.links.push(this);
            node.incoming.push(this);

            this.target = node;
        },

        /**
         * Changes both the source and the target nodes of this link.
         */
        changesNodes: function (v, w) {
            if (this.source == v) {
                this.changeSource(w);
            }
            else if (this.target == v) {
                this.changeTarget(w);
            }
        },

        /**
         * Reverses the direction of this link.
         */
        reverse: function () {
            var oldSource = this.source;
            var oldTarget = this.target;

            this.source = oldTarget;
            oldSource.outgoing.remove(this);
            this.source.outgoing.push(this);

            this.target = oldSource;
            oldTarget.incoming.remove(this);
            this.target.incoming.push(this);
            return this;
        },

        /**
         * Ensures that the given target defines the endpoint of this link.
         */
        directTo: function (target) {
            if (this.source != target && this.target != target) {
                throw "The given node is not incident with this link.";
            }
            if (this.target != target) {
                this.reverse();
            }
        },

        /**
         * Returns a reversed clone of this link.
         */
        createReverseEdge: function () {
            var r = this.clone();
            r.reverse();
            r.reversed = true;
            return r;
        },

        /**
         * Returns a clone of this link.
         */
        clone: function () {
            var clone = new Link(this.source, this.target);
            return clone;
        }
    });

    /*--------------Graph structure---------------------------------*/
    /**
     * Defines a directed graph structure.
     * Note that the incidence structure resides in the nodes through the incoming and outgoing links collection, rahter than
     * inside the Graph.
     */
    var Graph = kendo.Class.extend({
        init: function (idOrDiagram) {
            /**
             * The links or edge collection of this Graph.
             * @type {Array}
             */
            this.links = [];
            /**
             * The node or vertex collection of this Graph.
             * @type {Array}
             */
            this.nodes = [];
            /**
             * The optional reference to the Diagram on which this Graph is based.
             * @type {null}
             */
            this.diagram = null;

            /**
             * The root of this Graph. If not set explicitly the first Node with zero incoming links will be taken.
             * @type {null}
             * @private
             */
            this._root = null;
            if (isDefined(idOrDiagram)) {
                if (isString(idOrDiagram)) {
                    this.id = idOrDiagram;
                }
                else {
                    this.diagram = idOrDiagram;
                    this.id = idOrDiagram.id;
                }
            }
            else {
                this.id = randomId();
            }

            /**
             * The bounds of this graph if the nodes have spatial extension defined.
             * @type {Rect}
             */
            this.bounds = new Rect();
            // keeps track whether the children & parents have been created
            this._hasCachedRelationships = false;
            this.type = "Graph";
        },
        /**
         * Caches the relational information of parents and children in the 'parents' and 'children'
         * properties.
         * @param forceRebuild If set to true the relational info will be rebuild even if already present.
         */
        cacheRelationships: function (forceRebuild) {
            if (isUndefined(forceRebuild)) {
                forceRebuild = false;
            }
            if (this._hasCachedRelationships && !forceRebuild) {
                return;
            }
            for (var i = 0, len = this.nodes.length; i < len; i++) {
                var node = this.nodes[i];
                node.children = this.getChildren(node);
                node.parents = this.getParents(node);
            }
            this._hasCachedRelationships = true;
        },

        /**
         * Assigns tree-levels to the nodes assuming this is a tree graph.
         * If not connected or not a tree the process will succeed but
         * will have little meaning.
         * @param startNode The node from where the level numbering starts, usually the root of the tree.
         * @param visited The collection of visited nodes.
         * @param offset The offset or starting counter of the level info.
         */
        assignLevels: function (startNode, offset, visited) {
            if (startNode == null) {
                throw "Start node not specified.";
            }
            if (isUndefined(offset)) {
                offset = 0;
            }
            // if not done before, cache the parents and children
            this.cacheRelationships();
            if (isUndefined(visited)) {
                visited = new Dictionary();
                this.nodes.forEach(function (n) {
                    visited.add(n, false);
                });
            }
            visited.set(startNode, true);
            startNode.level = offset;
            var children = startNode.children;
            for (var i = 0, len = children.length; i < len; i++) {
                var child = children[i];
                if (child == null || visited.get(child)) {
                    continue;
                }
                this.assignLevels(child, offset + 1, visited);
            }
        },

        /**
         * Gets or set the root of this graph.
         * If not set explicitly the first Node with zero incoming links will be taken.
         * @param value
         * @returns {*}
         */
        root: function (value) {
            if (isUndefined(value)) {
                if (this._root == null) {
                    // TODO: better to use the longest path for the most probable root?
                    return this.nodes.first(function (n) {
                        return n.incoming.length == 0;
                    })
                }
                else {
                    return this._root;
                }
            }
            else {
                this._root = value;
            }
        },

        /**
         * Returns the connected components of this graph.
         * Note that the returned graphs are made up of the nodes and links of this graph, i.e. a pointer to the items of this graph.
         * If you alter the items of the components you'll alter the original graph and vice versa.
         * @returns {Array}
         */
        getConnectedComponents: function () {
            this.componentIndex = 0;
            this.setItemIndices();
            var componentId = initArray(this.nodes.length, -1);

            for (var v = 0; v < this.nodes.length; v++) {
                if (componentId[v] == -1) {
                    this._collectConnectedNodes(componentId, v);
                    this.componentIndex++;
                }
            }

            var components = [];
            for (var i = 0; i < this.componentIndex; ++i) {
                components[i] = new Graph();
            }
            for (var i = 0; i < componentId.length; ++i) {
                var graph = components[componentId[i]];
                graph.addNodeAndOutgoings(this.nodes[i]);
            }
            // sorting the components in decreasing order of node count
            components.sort(function (a, b) {
                return b.nodes.length - a.nodes.length;
            });
            return components;
        },

        _collectConnectedNodes: function (setIds, nodeIndex) {
            setIds[nodeIndex] = this.componentIndex; // part of the current component
            var node = this.nodes[nodeIndex];
            node.links.forEach(
                function (link) {
                    var next = link.getComplement(node);
                    var nextId = next.index;
                    if (setIds[nextId] == -1) {
                        this._collectConnectedNodes(setIds, nextId);
                    }
                }, this);
        },

        /**
         * Calculates the bounds of this Graph if the Nodes have spatial dimensions defined.
         * @returns {Rect}
         */
        calcBounds: function () {
            if (this.isEmpty()) {
                this.bounds = new Rect();
                return this.bounds;
            }
            var b = null;
            for (var i = 0, len = this.nodes.length; i < len; i++) {
                var node = this.nodes[i];
                if (b == null) {
                    b = node.bounds();
                }
                else {
                    b = b.union(node.bounds());
                }
            }
            this.bounds = b;
            return this.bounds;
        },

        /**
         * Creates a spanning tree for the current graph.
         * Important: this will not return a spanning forest if the graph is disconnected.
         * Prim's algorithm  finds a minimum-cost spanning tree of an edge-weighted, connected, undirected graph;
         * see http://en.wikipedia.org/wiki/Prim%27s_algorithm .
         * @param root The root of the spanning tree.
         * @returns {Graph}
         */
        getSpanningTree: function (root) {
            var tree = new Graph();
            var map = new Dictionary(), source, target;
            tree.root = root.clone();
            tree.root.level = 0;
            tree.root.id = root.id;
            map.add(root, tree.root);
            root.level = 0;

            var visited = [];
            var remaining = [];
            tree.nodes.add(tree.root);
            visited.add(root);
            remaining.add(root);

            var levelCount = 1;
            while (remaining.length > 0) {
                var next = remaining.pop();
                next.links.forEach(function (link) {
                    var cn = link.getComplement(next);
                    if (visited.contains(cn)) {
                        return;
                    }

                    cn.level = next.level + 1;
                    if (levelCount < cn.level + 1) {
                        levelCount = cn.level + 1;
                    }
                    if (!remaining.contains(cn)) {
                        remaining.add(cn);
                    }
                    if (!visited.contains(cn)) {
                        visited.add(cn);
                    }
                    if (map.containsKey(next)) {
                        source = map.get(next);
                    }
                    else {
                        source = next.clone();
                        source.level = next.level;
                        source.id = next.id;
                        map.add(next, source);
                    }
                    if (map.containsKey(cn)) {
                        target = map.get(cn);
                    }
                    else {
                        target = cn.clone();
                        target.level = cn.level;
                        target.id = cn.id;
                        map.add(cn, target);
                    }
                    var newLink = new Link(source, target);
                    tree.addLink(newLink);

                });
            }

            var treeLevels = [];
            for (var i = 0; i < levelCount; i++) {
                treeLevels.add([]);
            }

            tree.nodes.forEach(function (node) {
                treeLevels[node.level].add(node);
            });

            tree.treeLevels = treeLevels;
            tree.cacheRelationships();
            return tree;
        },

        /**
         * Returns a random node in this graph.
         * @param excludedNodes The collection of nodes which should not be considered.
         * @param incidenceLessThan The maximum degree or incidence the random node should have.
         * @returns {*}
         */
        takeRandomNode: function (excludedNodes, incidenceLessThan) {
            if (isUndefined(excludedNodes)) {
                excludedNodes = [];
            }
            if (isUndefined(incidenceLessThan)) {
                incidenceLessThan = 4;
            }
            if (this.nodes.length == 0) {
                return null;
            }
            if (this.nodes.length == 1) {
                return excludedNodes.contains(this.nodes[0]) ? null : this.nodes[0];
            }
            var pool = this.nodes.where(function (node) {
                return !excludedNodes.contains(node) && node.degree() <= incidenceLessThan
            });
            if (pool.isEmpty()) {
                return null;
            }
            return pool[randomInteger(0, pool.length)];
        },

        /**
         * Returns whether this is an empty graph.
         */
        isEmpty: function () {
            return this.nodes.isEmpty();
        },

        /**
         * Checks whether the endpoints of the links are all in the nodes collection.
         */
        isHealthy: function () {
            return this.links.all(function (link) {
                return this.nodes.contains(link.source) && this.nodes.contains(link.target);
            }, this)
        },

        /**
         * Gets the parents of this node, defined as the adjacent nodes with a link from the adjacent node to this one.
         * @returns {Array}
         */
        getParents: function (n) {
            if (!this.hasNode(n)) {
                throw "The given node is not part of this graph.";
            }
            return n.getParents();
        },

        /**
         * Gets the children of this node, defined as the adjacent nodes with a link from this node to the adjacent one.
         * @returns {Array}
         */
        getChildren: function (n) {
            if (!this.hasNode(n)) {
                throw "The given node is not part of this graph.";
            }
            return n.getChildren();
        },

        /**
         * Adds a new link to the graph between the given nodes.
         */
        addLink: function (sourceOrLink, target, owner) {

            if (isUndefined(sourceOrLink)) {
                throw "The source of the link is not defined.";
            }
            if (isUndefined(target)) {
                // can only be undefined if the first one is a Link
                if (isDefined(sourceOrLink.type) && sourceOrLink.type == "Link") {
                    this.addExistingLink(sourceOrLink);
                    return;
                }
                else {
                    throw "The target of the link is not defined.";
                }
            }

            var foundSource = this.getNode(sourceOrLink);
            if (isUndefined(foundSource)) {
                foundSource = this.addNode(sourceOrLink);
            }
            var foundTarget = this.getNode(target);
            if (isUndefined(foundTarget)) {
                foundTarget = this.addNode(target);
            }

            var newLink = new Link(foundSource, foundTarget);

            if (isDefined(owner)) {
                newLink.owner = owner;
            }

            /*newLink.source.outgoing.push(newLink);
             newLink.source.links.push(newLink);
             newLink.target.incoming.push(newLink);
             newLink.target.links.push(newLink);*/

            this.links.push(newLink);

            return newLink;
        },

        /**
         * Removes all the links in this graph.
         */
        removeAllLinks: function () {
            while (this.links.length > 0) {
                var link = this.links[0];
                this.removeLink(link);
            }
        },

        /**
         * Adds the given link to the current graph.
         */
        addExistingLink: function (link) {

            if (this.hasLink(link)) {
                return;
            }
            this.links.push(link);
            if (this.hasNode(link.source.id)) {
                // priority to the existing node with the id even if other props are different
                var s = this.getNode(link.source.id);
                link.changeSource(s);
            }
            else {
                this.addNode(link.source);
            }

            if (this.hasNode(link.target.id)) {
                var t = this.getNode(link.target.id);
                link.changeTarget(t);
            }
            else {
                this.addNode(link.target);
            }

            /*  if (!link.source.outgoing.contains(link)) {
             link.source.outgoing.push(link);
             }
             if (!link.source.links.contains(link)) {
             link.source.links.push(link);
             }
             if (!link.target.incoming.contains(link)) {
             link.target.incoming.push(link);
             }
             if (!link.target.links.contains(link)) {
             link.target.links.push(link);
             }*/
        },

        /**
         * Returns whether the given identifier or Link is part of this graph.
         * @param linkOrId An identifier or a Link object.
         * @returns {*}
         */
        hasLink: function (linkOrId) {
            if (isString(linkOrId)) {
                return this.links.any(function (link) {
                    return link.id == linkOrId;
                })
            }
            if (linkOrId.type == "Link") {
                return this.links.contains(linkOrId);
            }
            throw "The given object is neither an identifier nor a Link.";
        },
        /**
         * Gets the node with the specified Id or null if not part of this graph.
         */
        getNode: function (nodeOrId) {
            if (isUndefined(nodeOrId)) {
                throw "No identifier or Node specified.";
            }
            if (isString(nodeOrId)) {
                return this.nodes.find(function (n) {
                    return n.id == nodeOrId;
                });
            }
            else {
                if (this.hasNode(nodeOrId)) {
                    return nodeOrId;
                }
                else {
                    return null;
                }
            }
        },

        /**
         * Returns whether the given node or node Id is part of this graph.
         */
        hasNode: function (nodeOrId) {
            if (isString(nodeOrId)) {
                return this.nodes.any(function (n) {
                    return n.id == nodeOrId;
                });
            }
            if (isObject(nodeOrId)) {
                return this.nodes.any(function (n) {
                    return n == nodeOrId;
                });
            }
            throw "The identifier should be a Node or the Id (string) of a node.";
        },

        /**
         * Removes the given node from this graph.
         * The node can be specified as an object or as an identifier (string).
         */
        removeNode: function (nodeOrId) {
            var n = nodeOrId;
            if (isString(nodeOrId)) {
                n = this.getNode(nodeOrId);
            }

            if (isDefined(n)) {
                var links = n.links;
                n.links = [];
                for (var i = 0, len = links.length; i < len; i++) {
                    var link = links[i];
                    this.removeLink(link);
                }
                this.nodes.remove(n);
            }
            else {
                throw "The identifier should be a Node or the Id (string) of a node.";
            }
        },

        /**
         * Returns whether the given nodes are connected with a least one link independently of the direction.
         */
        areConnected: function (n1, n2) {
            return this.links.any(function (link) {
                return link.source == n1 && link.target == n2 || link.source == n2 && link.target == n1;
            })
        },

        /**
         * Removes the given link from this graph.
         */
        removeLink: function (link) {
            /*    if (!this.links.contains(link)) {
             throw "The given link is not part of the Graph.";
             }
             */
            this.links.remove(link);

            link.source.outgoing.remove(link);
            link.source.links.remove(link);
            link.target.incoming.remove(link);
            link.target.links.remove(link);
        },

        /**
         * Adds a new node to this graph, if not already present.
         * The node can be an existing Node or the identifier of a new node.
         * No error is thrown if the node is already there and the existing one is returned.
         */
        addNode: function (nodeOrId, layoutRect, owner) {

            var newNode = null;

            if (!isDefined(nodeOrId)) {
                throw "No Node or identifier for a new Node is given."
            }

            if (isString(nodeOrId)) {
                if (this.hasNode(nodeOrId)) {
                    return this.getNode(nodeOrId);
                }
                newNode = new Node(nodeOrId);
            }
            else {
                if (this.hasNode(nodeOrId)) {
                    return this.getNode(nodeOrId);
                }
                // todo: ensure that the param is a Node?
                newNode = nodeOrId;
            }

            if (isDefined(layoutRect)) {
                newNode.bounds(layoutRect);
            }

            if (isDefined(owner)) {
                newNode.owner = owner;
            }
            this.nodes.add(newNode);
            return newNode;
        },

        /**
         * Adds the given Node and its outgoing links.
         */
        addNodeAndOutgoings: function (node) {

            if (!this.nodes.contains(node)) {
                this.nodes.push(node);
            }

            var newLinks = node.outgoing;
            node.outgoing = [];
            newLinks.forEach(function (link) {
                this.addExistingLink(link);
            }, this);
        },

        /**
         * Sets the 'index' property on the links and nodes of this graph.
         */
        setItemIndices: function () {

            for (var i = 0; i < this.nodes.length; ++i) {
                this.nodes[i].index = i;
            }

            for (var i = 0; i < this.links.length; ++i) {
                this.links[i].index = i;
            }
        },

        /**
         * Returns a clone of this graph.
         */
        clone: function (saveMapping) {
            var copy = new Graph();
            var save = isDefined(saveMapping) && saveMapping == true;
            if (save) {
                copy.nodeMap = new Dictionary();
                copy.linkMap = new Dictionary();
            }
            // we need a map even if the saveMapping is not set
            var map = new Dictionary();
            this.nodes.forEach(function (nOriginal) {
                var nCopy = nOriginal.clone();
                map.set(nOriginal, nCopy);
                copy.nodes.push(nCopy);

                if (save) {
                    copy.nodeMap.set(nCopy, nOriginal);
                }
            });

            this.links.forEach(function (linkOriginal) {
                if (map.containsKey(linkOriginal.source) && map.containsKey(linkOriginal.target)) {
                    var linkCopy = copy.addLink(map.get(linkOriginal.source), map.get(linkOriginal.target));
                    if (save) {
                        copy.linkMap.set(linkCopy, linkOriginal);
                    }
                }
            });

            return copy;
        },

        /**
         * The parsing allows a quick way to create graphs.
         *  - ["n1->n2", "n2->n3"]: creates the three nodes and adds the links
         *  - ["n1->n2", {id: "QSDF"}, "n2->n3"]: same as previous but also performs a deep extend of the link between n1 and n2 with the given object.
         */
        linearize: function (addIds) {
            return Graph.Utils.linearize(this, addIds);
        },

        /**
         * Performs a depth-first traversal starting at the given node.
         * @param startNode a node or id of a node in this graph
         * @param action
         */
        depthFirstTraversal: function (startNode, action) {
            if (isUndefined(startNode)) {
                throw "You need to supply a starting node.";
            }
            if (isUndefined(action)) {
                throw "You need to supply an action."
            }
            if (!this.hasNode(startNode)) {
                throw "The given start-node is not part of this graph";
            }
            var foundNode = this.getNode(startNode);// case the given one is an Id
            var visited = [];
            this._dftIterator(foundNode, action, visited);
        },

        _dftIterator: function (node, action, visited) {

            action(node);
            visited.add(node);
            var children = node.getChildren();
            for (var i = 0, len = children.length; i < len; i++) {
                var child = children[i];
                if (visited.contains(child)) {
                    continue;
                }
                this._dftIterator(child, action, visited);
            }
        },

        /**
         * Performs a breadth-first traversal starting at the given node.
         * @param startNode a node or id of a node in this graph
         * @param action
         */
        breadthFirstTraversal: function (startNode, action) {

            if (isUndefined(startNode)) {
                throw "You need to supply a starting node.";
            }
            if (isUndefined(action)) {
                throw "You need to supply an action."
            }

            if (!this.hasNode(startNode)) {
                throw "The given start-node is not part of this graph";
            }
            var foundNode = this.getNode(startNode);// case the given one is an Id
            var queue = new Queue();
            var visited = [];
            queue.enqueue(foundNode);

            while (queue.length > 0) {
                var node = queue.dequeue();
                action(node);
                visited.add(node);
                var children = node.getChildren();
                for (var i = 0, len = children.length; i < len; i++) {
                    var child = children[i];
                    if (visited.contains(child) || queue.contains(child)) {
                        continue;
                    }
                    queue.enqueue(child);
                }
            }
        },

        /**
         * This is the classic Tarjan algorithm for strongly connected components.
         * See e.g. http://en.wikipedia.org/wiki/Tarjan's_strongly_connected_components_algorithm
         * @param excludeSingleItems Whether isolated nodes should be excluded from the analysis.
         * @param node The start node from which the analysis starts.
         * @param indices  Numbers the nodes consecutively in the order in which they are discovered.
         * @param lowLinks The smallest index of any node known to be reachable from the node, including the node itself
         * @param connected The current component.
         * @param stack The bookkeeping stack of things to visit.
         * @param index The counter of visited nodes used to assign the indices.
         * @private
         */
        _stronglyConnectedComponents: function (excludeSingleItems, node, indices, lowLinks, connected, stack, index) {
            indices.add(node, index);
            lowLinks.add(node, index);
            index++;

            stack.push(node);

            var children = node.getChildren();
            for (var i = 0, len = children.length; i < len; i++) {
                var next = children[i];
                if (!indices.containsKey(next)) {
                    this._stronglyConnectedComponents(excludeSingleItems, next, indices, lowLinks, connected, stack, index);
                    lowLinks.add(node, Math.min(lowLinks.get(node), lowLinks.get(next)));
                }
                else if (stack.contains(next)) {
                    lowLinks.add(node, Math.min(lowLinks.get(node), indices.get(next)));
                }
            }
            // If v is a root node, pop the stack and generate a strong component
            if (lowLinks.get(node) == indices.get(node)) {
                var next, component = [];
                do {
                    next = stack.pop();
                    component.add(next);
                }
                while (next != node)

                if (!excludeSingleItems || (component.length > 1)) {
                    connected.add(component)
                }
            }
        },

        /**
         * Returns the cycles found in this graph.
         * The returned arrays consist of the nodes which are strongly coupled.
         * @param excludeSingleItems Whether isolated nodes should be excluded.
         * @returns {Array} The array of cycles found.
         */
        findCycles: function (excludeSingleItems) {
            if (isUndefined(excludeSingleItems)) {
                excludeSingleItems = true;
            }
            var indices = new Dictionary();
            var lowLinks = new Dictionary();
            var connected = [];
            var stack = [];
            for (var i = 0, len = this.nodes.length; i < len; i++) {
                var node = this.nodes[i];
                if (indices.containsKey(node)) {
                    continue;
                }
                this._stronglyConnectedComponents(excludeSingleItems, node, indices, lowLinks, connected, stack, 0);
            }
            return connected;
        },

        /**
         * Returns whether this graph is acyclic.
         * @returns {*}
         */
        isAcyclic: function () {
            return this.findCycles().isEmpty();
        },

        /**
         * Returns whether the given graph is a subgraph of this one.
         * @param other Another graph instance.
         */
        isSubGraph: function (other) {
            var otherArray = other.linearize();
            var thisArray = this.linearize();
            return otherArray.all(function (s) {
                return thisArray.contains(s);
            });
        },

        /**
         *  Makes an acyclic graph from the current (connected) one.
         * * @returns {Array} The reversed links.
         */
        makeAcyclic: function () {
            // if empty or almost empty
            if (this.isEmpty() || this.nodes.length <= 1 || this.links.length <= 1) {
                return [];
            }
            // singular case of just two nodes
            if (this.nodes.length == 2) {
                var result = [];
                if (this.links.length > 1) {
                    var oneLink = this.links[0];
                    var oneNode = oneLink.source;
                    for (var i = 0, len = this.links.length; i < len; i++) {
                        var link = this.links[i];
                        if (link.source == oneNode) {
                            continue;
                        }
                        var rev = link.reverse();
                        result.add(rev);
                    }
                }
                return result;
            }

            var copy = this.clone(true); // copy.nodeMap tells you the mapping
            var N = this.nodes.length;

            var intensityCatalog = new Dictionary();

            /**
             * If there are both incoming and outgoing links this will return the flow intensity (out-in).
             * Otherwise the node acts as a flow source with N specifying the (equal) intensity.
             * @param node
             * @returns {number}
             */
            var flowIntensity = function (node) {
                if (node.outgoing.length == 0) {
                    return (2 - N);
                }
                else if (node.incoming.length == 0) {
                    return (N - 2);
                }
                else {
                    return node.outgoing.length - node.incoming.length;
                }
            }

            /**
             * Collects the nodes with the same intensity.
             * @param node
             * @param intensityCatalog
             */
            var catalogEqualIntensity = function (node, intensityCatalog) {
                var intensity = flowIntensity(node, N);
                if (!intensityCatalog.containsKey(intensity)) {
                    intensityCatalog.set(intensity, []);
                }
                intensityCatalog.get(intensity).push(node);
            }

            copy.nodes.forEach(function (v) {
                catalogEqualIntensity(v, intensityCatalog);
            });

            var sourceStack = [];
            var targetStack = [];

            while (copy.nodes.length > 0) {
                if (intensityCatalog.containsKey(2 - N)) {
                    var targets = intensityCatalog.get(2 - N); // nodes without outgoings
                    while (targets.length > 0) {
                        var target = targets.pop();
                        target.links.forEach(function (link) {
                            var source = link.getComplement(target);
                            var intensity = flowIntensity(source, N);
                            intensityCatalog.get(intensity).remove(source);
                            source.removeLink(link);
                            catalogEqualIntensity(source, intensityCatalog);
                        });
                        copy.nodes.remove(target);
                        targetStack.unshift(target);
                    }
                }

                // move sources to sourceStack
                if (intensityCatalog.containsKey(N - 2)) {
                    var sources = intensityCatalog.get(N - 2); // nodes without incomings
                    while (sources.length > 0) {
                        var source = sources.pop();
                        source.links.forEach(function (link) {
                            var target = link.getComplement(source);
                            var intensity = flowIntensity(target, N);
                            intensityCatalog.get(intensity).remove(target);
                            target.removeLink(link);
                            catalogEqualIntensity(target, intensityCatalog);
                        });
                        sourceStack.push(source);
                        copy.nodes.remove(source);
                    }
                }

                if (copy.nodes.length > 0) {
                    for (var i = N - 3; i > 2 - N; i--) {
                        if (intensityCatalog.containsKey(i) &&
                            intensityCatalog.get(i).length > 0) {
                            var maxdiff = intensityCatalog.get(i);
                            var v = maxdiff.pop();
                            v.links.forEach(function (e) {
                                var u = e.getComplement(v);
                                var intensity = flowIntensity(u, N);
                                intensityCatalog.get(intensity).remove(u);
                                u.removeLink(e);
                                catalogEqualIntensity(u, intensityCatalog);
                            });

                            sourceStack.push(v);
                            copy.nodes.remove(v);
                            break;
                        }
                    }
                }
            }

            sourceStack = sourceStack.concat(targetStack);

            var vertexOrder = new Dictionary();
            for (var i = 0; i < this.nodes.length; i++) {
                vertexOrder.set(copy.nodeMap.get(sourceStack[i]), i);
            }

            var reversedEdges = [];
            this.links.forEach(function (link) {
                if (vertexOrder.get(link.source) > vertexOrder.get(link.target)) {
                    link.reverse();
                    reversedEdges.push(link);
                }
            });
            return reversedEdges;
        }
    });

    /**
     * A collection of predefined graphs for demo and testing purposes.
     */
    Graph.Predefined = {
        /**
         * Eight-shapes graph all connected in a cycle.
         * @returns {*}
         * @constructor
         */
        EightGraph: function () {
            return Graph.Utils.parse([ "1->2", "2->3", "3->4", "4->1", "3->5", "5->6", "6->7", "7->3"]);
        },

        /**
         * Creates a typical mindmap diagram.
         * @returns {*}
         * @constructor
         */
        Mindmap: function () {
            return Graph.Utils.parse(["0->1", "0->2", "0->3", "0->4", , "0->5", "1->6", , "1->7", "7->8", "2->9", "9->10", "9->11", "3->12",
                "12->13", "13->14", "4->15", "4->16", "15->17", "15->18", "18->19", "18->20", "14->21", "14->22", "5->23", "23->24", "23->25", "6->26"]);
        },

        /**
         * Three nodes connected in a cycle.
         * @returns {*}
         * @constructor
         */
        ThreeGraph: function () {
            return Graph.Utils.parse([ "1->2", "2->3", "3->1"]);
        },

        /**
         * A tree with each node having two children.
         * @param levels How many levels the binary tree should have.
         * @returns {diagram.Graph}
         * @constructor
         */
        BinaryTree: function (levels) {
            if (isUndefined(levels)) {
                levels = 5;
            }
            return Graph.Utils.createBalancedTree(levels, 2);
        },

        /**
         * A linear graph (discrete line segment).
         * @param length How many segments (the node count is hence (length+1)).
         * @returns {diagram.Graph}
         * @constructor
         */
        Linear: function (length) {
            if (isUndefined(length)) {
                length = 10;
            }
            return Graph.Utils.createBalancedTree(length, 1);
        },

        /**
         * A standard tree-graph with the specified levels and children (siblings) count.
         * Note that for a balanced tree of level N and sibling count s, counting the root as level zero:
         *  - NodeCount = (1-s^(N+1))/(1-s)]
         *  - LinkCount = s.(1-s^N)/(1-s)
         * @param levels How many levels the tree should have.
         * @param siblingsCount How many siblings each level should have.
         * @returns {diagram.Graph}
         * @constructor
         */
        Tree: function (levels, siblingsCount) {
            return Graph.Utils.createBalancedTree(levels, siblingsCount);
        },

        /**
         * Creates a forest.
         * Note that for a balanced forest of level N, sibling count s and tree count t, counting the root as level zero:
         *  - NodeCount = t.(1-s^(N+1))/(1-s)]
         *  - LinkCount = t.s.(1-s^N)/(1-s)
         * @param levels How many levels the tree should have.
         * @param siblingsCount How many siblings each level should have.
         * @param trees The amount of trees the forest should have.
         * @returns {diagram.Graph}
         * @constructor
         */
        Forest: function (levels, siblingsCount, trees) {
            return Graph.Utils.createBalancedForest(levels, siblingsCount, trees);
        },

        /**
         * A workflow-like graph with cycles.
         * @returns {*}
         * @constructor
         */
        Workflow: function () {
            return Graph.Utils.parse(
                ["0->1", "1->2", "2->3", "1->4", "4->3", "3->5", "5->6", "6->3", "6->7", "5->4"]
            );
        },

        /**
         * A grid graph with the direction of the links avoiding cycles.
         * Node count: (n+1).(m+1)
         * Link count: n.(m+1) + m.(n+1)
         * @param n Horizontal count of grid cells. If zero this will result in a linear graph.
         * @param m Vertical count of grid cells. If zero this will result in a linear graph.
         * @constructor
         */
        Grid: function (n, m) {
            var g = new diagram.Graph();
            if (n <= 0 && m <= 0) {
                return g;
            }

            for (var i = 0; i < n + 1; i++) {
                var previous = null;
                for (var j = 0; j < m + 1; j++) {
                    // using x-y coordinates to name the nodes
                    var node = new Node(i.toString() + "." + j.toString());
                    g.addNode(node);
                    if (previous != null) {
                        g.addLink(previous, node);
                    }
                    if (i > 0) {
                        var left = g.getNode((i - 1).toString() + "." + j.toString());
                        g.addLink(left, node)
                    }
                    previous = node;
                }
            }
            return g;
        }

    }

    /**
     * Graph generation and other utilities.
     */
    Graph.Utils = {
        /**
         * The parsing allows a quick way to create graphs.
         *  - ["n1->n2", "n2->n3"]: creates the three nodes and adds the links
         *  - ["n1->n2", {id: "id177"}, "n2->n3"]: same as previous but also performs a deep extend of the link between n1 and n2 with the given object.
         */
        parse: function (graphString) {

            var previousLink, graph = new diagram.Graph(), parts = graphString.slice();
            for (var i = 0, len = parts.length; i < len; i++) {
                var part = parts[i];
                if (isString(part)) // link spec
                {
                    if (part.indexOf("->") < 0) {
                        throw "The link should be specified as 'a->b'.";
                    }
                    var p = part.split("->");
                    if (p.length != 2) {
                        throw "The link should be specified as 'a->b'.";
                    }
                    previousLink = new Link(p[0], p[1]);
                    graph.addLink(previousLink);
                }
                if (isObject(part)) {
                    if (previousLink == null) {
                        throw "Specification found before Link definition.";
                    }
                    kendo.deepExtend(previousLink, part);
                }
            }
            return graph;
        },

        /**
         * Returns a linearized representation of the given Graph.
         * See also the Graph.Utils.parse method for the inverse operation.
         */
        linearize: function (graph, addIds) {
            if (isUndefined(graph)) {
                throw "Expected an instance of a Graph object in slot one.";
            }
            if (isUndefined(addIds)) {
                addIds = false;
            }
            var lin = [];
            for (var i = 0, len = graph.links.length; i < len; i++) {
                var link = graph.links[i];
                lin.add(link.source.id + "->" + link.target.id);
                if (addIds) {
                    lin.add({id: link.id});
                }
            }
            return lin;
        },

        /**
         * The method used by the diagram creation to instantiate a shape.
         * @param kendoDiagram The Kendo diagram where the diagram will be created.
         * @param p The position at which to place the shape.
         * @param shapeOptions Optional Shape options.
         * @param id Optional identifier of the shape.
         * @returns {*}
         * @private
         */
        _addShape: function (kendoDiagram, p, id, shapeOptions) {
            if (isUndefined(p)) {
                p = new diagram.Point(0, 0);
            }
            if (isUndefined(id)) {
                id = randomId();
            }
            shapeOptions = kendo.deepExtend({
                width: 20,
                height: 20,
                id: id,
                center: new Point(10, 10),
                radius: 10,
                background: "#778899",
                data: "circle"
            }, shapeOptions);

            return kendoDiagram.addShape(p, shapeOptions);
        },
        /**
         * The method used by the diagram creation to instantiate a connection.
         * @param diagram he Kendo diagram where the diagram will be created.
         * @param from The source shape.
         * @param to The target shape.
         * @param options Optional Connection options.
         * @returns {*}
         * @private
         */
        _addConnection: function (diagram, from, to, options) {
            var f = from.getConnector("Top");
            var t = to.getConnector("Top");
            return diagram.connect(from, to, options);
        },
        /**
         * Creates a diagram from the given Graph.
         * @param diagram The Kendo diagram where the diagram will be created.
         * @param graph The graph structure defining the diagram.
         */
        createDiagramFromGraph: function (diagram, graph, doLayout, randomSize) {

            if (isUndefined(diagram)) {
                throw "The diagram surface is undefined.";
            }
            if (isUndefined(graph)) {
                throw "No graph specification defined."
            }
            if (isUndefined(doLayout)) {
                doLayout = true;
            }
            if (isUndefined(randomSize)) {
                randomSize = false;
            }

            var width = diagram.element.clientWidth || 200;
            var height = diagram.element.clientHeight || 200;
            var map = [];
            for (var i = 0, len = graph.nodes.length; i < len; i++) {
                var node = graph.nodes[i];
                var p = node.position;
                if (isUndefined(p)) {
                    if (isDefined(node.x) && isDefined(node.y)) {
                        p = new Point(node.x, node.y);
                    }
                    else {
                        p = new Point(randomInteger(10, width - 20), randomInteger(10, height - 20));
                    }
                }
                var opt = {};

                if (node.id == "0") {
                   /* kendo.deepExtend(opt,
                        {
                            background: "Orange",
                            data: 'circle',
                            width: 100,
                            height: 100,
                            center: new Point(50, 50)
                        });*/
                }
                else if (randomSize) {
                    kendo.deepExtend(opt, {
                        width: Math.random() * 150 + 20,
                        height: Math.random() * 80 + 50,
                        data: 'rectangle',
                        background: "#778899"
                    })
                }

                var shape = this._addShape(diagram, p, node.id, opt);
                //shape.content(node.id);

                var bounds = shape.bounds();
                if (isDefined(bounds)) {
                    node.x = bounds.x;
                    node.y = bounds.y;
                    node.width = bounds.width;
                    node.height = bounds.height;
                }
                map[node.id] = shape;
            }
            for (var i = 0, len = graph.links.length; i < len; i++) {
                var link = graph.links[i];
                var sourceShape = map[link.source.id];
                if (isUndefined(sourceShape)) {
                    continue;
                }
                var targetShape = map[link.target.id];
                if (isUndefined(targetShape)) {
                    continue;
                }
                this._addConnection(diagram, sourceShape, targetShape, {id: link.id});

            }
            if (doLayout) {
                var l = new SpringLayout(diagram);
                l.layoutGraph(graph, {limitToView: false});
                for (var i = 0, len = graph.nodes.length; i < len; i++) {
                    var node = graph.nodes[i];
                    var shape = map[node.id];
                    shape.bounds(new Rect(node.x, node.y, node.width, node.height));
                }
            }
        },

        /**
         * Creates a diagram the given short (linear) form.
         * @param diagram
         * @param shortForm
         */
        createDiagramFromShort: function (diagram, shortForm) {

        },

        /**
         * Creates a balanced tree with the specified number of levels and siblings count.
         * Note that for a balanced tree of level N and sibling count s, counting the root as level zero:
         *  - NodeCount = (1-s^(N+1))/(1-s)]
         *  - LinkCount = s.(1-s^N)/(1-s)
         * @param levels How many levels the tree should have.
         * @param siblingsCount How many siblings each level should have.
         * @returns {diagram.Graph}
         */
        createBalancedTree: function (levels, siblingsCount) {
            if (isUndefined(levels)) {
                levels = 3;
            }
            if (isUndefined(siblingsCount)) {
                siblingsCount = 3;
            }

            var g = new diagram.Graph(), counter = -1, lastAdded = [], news;
            if (levels <= 0 || siblingsCount <= 0) {
                return g;
            }
            var root = new Node((++counter).toString());
            g.addNode(root);
            g.root = root;
            lastAdded.add(root);
            for (var i = 0; i < levels; i++) {
                news = [];
                for (var j = 0; j < lastAdded.length; j++) {
                    var parent = lastAdded[j];
                    for (var k = 0; k < siblingsCount; k++) {
                        var item = new Node((++counter).toString());
                        g.addLink(parent, item);
                        news.add(item);
                    }
                }
                lastAdded = news;
            }
            return g;
        },

        /**
         * Creates a balanced tree with the specified number of levels and siblings count.
         * Note that for a balanced forest of level N, sibling count s and tree count t, counting the root as level zero:
         *  - NodeCount = t.(1-s^(N+1))/(1-s)]
         *  - LinkCount = t.s.(1-s^N)/(1-s)
         * @param levels How many levels the tree should have.
         * @param siblingsCount How many siblings each level should have.
         * @returns {diagram.Graph}
         * @param treeCount The number of trees the forest should have.
         */
        createBalancedForest: function (levels, siblingsCount, treeCount) {
            if (isUndefined(levels)) {
                levels = 3;
            }
            if (isUndefined(siblingsCount)) {
                siblingsCount = 3;
            }
            if (isUndefined(treeCount)) {
                treeCount = 5;
            }
            var g = new diagram.Graph(), counter = -1, lastAdded = [], news;
            if (levels <= 0 || siblingsCount <= 0 || treeCount <= 0) {
                return g;
            }

            for (var t = 0; t < treeCount; t++) {
                var root = new Node((++counter).toString());
                g.addNode(root);
                lastAdded = [root];
                for (var i = 0; i < levels; i++) {
                    news = [];
                    for (var j = 0; j < lastAdded.length; j++) {
                        var parent = lastAdded[j];
                        for (var k = 0; k < siblingsCount; k++) {
                            var item = new Node((++counter).toString());
                            g.addLink(parent, item);
                            news.add(item);
                        }
                    }
                    lastAdded = news;
                }
            }
            return g;
        },

        /**
         * Creates a random graph (uniform distribution) with the specified amount of nodes.
         * @param nodeCount The amount of nodes the random graph should have.
         * @param maxIncidence The maximum allowed degree of the nodes.
         * @param isTree Whether the return graph should be a tree (default: false).
         * @returns {diagram.Graph}
         */
        createRandomConnectedGraph: function (nodeCount, maxIncidence, isTree) {

            /* Swa's Mathematica export of random Bernoulli graphs
             gr[n_,p_]:=Module[{g=RandomGraph[BernoulliGraphDistribution[n,p],VertexLabels->"Name",DirectedEdges->True]},
             While[Not[ConnectedGraphQ[g]],g=RandomGraph[BernoulliGraphDistribution[n,p],VertexLabels->"Name",DirectedEdges->True]];g];
             project[a_]:=("\""<>ToString[Part[#,1]]<>"->"<>ToString[Part[#,2]]<>"\"")&     @ a;
             export[g_]:=project/@ EdgeList[g]
             g = gr[12,.1]
             export [g]
             */

            if (isUndefined(nodeCount)) {
                nodeCount = 40;
            }
            if (isUndefined(maxIncidence)) {
                maxIncidence = 4;
            }
            if (isUndefined(isTree)) {
                isTree = false;
            }

            var g = new diagram.Graph(), counter = -1;
            if (nodeCount <= 0) {
                return g;
            }

            var root = new Node((++counter).toString());
            g.addNode(root);
            if (nodeCount == 1) {
                return g;
            }
            if (nodeCount > 1) {
                // random tree
                for (var i = 1; i < nodeCount; i++) {
                    var poolNode = g.takeRandomNode([], maxIncidence);
                    if (poolNode == null) {
                        //failed to find one so the graph will have less nodes than specified
                        break;
                    }
                    var newNode = g.addNode(i.toString());
                    g.addLink(newNode, poolNode);
                }
                if (!isTree && nodeCount > 1) {
                    var randomAdditions = randomInteger(1, nodeCount);
                    for (var i = 0; i < randomAdditions; i++) {
                        var n1 = g.takeRandomNode([], maxIncidence);
                        var n2 = g.takeRandomNode([], maxIncidence);
                        if (n1 != null && n2 != null && !g.areConnected(n1, n2)) {
                            g.addLink(n1, n2);
                        }
                    }
                }
                return g;
            }
        }
    }



    kendo.deepExtend(diagram, {
        init: function (element) {
            kendo.init(element, kendo.diagram.ui);
        },

        Point: Point,
        Intersect: Intersect,
        Rect: Rect,
        Size: Size,
        RectAlign: RectAlign,
        Matrix: Matrix,
        MatrixVector: MatrixVector,
        Range: Range,
        normalVariable: normalVariable,
        randomId: randomId,
        Dictionary: Dictionary,
        HashTable: HashTable,
        Queue: Queue,
        Set: Set,
        Node: Node,
        Link: Link,
        Graph: Graph

    });
})
    (window.kendo.jQuery);

/*-------------------Diverse math functions----------------------------*/

Math.sign = function (number) {
    return number ? number < 0 ? -1 : 1 : 0;
};
Math.epsilon = 0.000001;
/*-------------------Diverse utilities----------------------------*/

isDefined = function (obj) {
    return !(typeof obj === 'undefined');
};

isUndefined = function (obj) {
    return (typeof obj === 'undefined') || obj == null;
};

/**
 * Returns whether the given object is an object or a value.
 */
isObject = function (obj) {
    return obj === Object(obj);
};

/**
 * Returns whether the object has a property with the given name.
 */
has = function (obj, key) {
    return Object.hasOwnProperty.call(obj, key);
};

/**
 * Returns whether the given object is a function.
 */
isFunction = function (obj) {
    return typeof obj === 'function';
};

/**
 * Returns whether the given object is a string.
 */
isString = function (obj) {
    return Object.prototype.toString.call(obj) == '[object String]';
};

isType = function (obj, type) {
    return Object.prototype.toString.call(obj) == '[object ' + type + ']';
}
/**
 * Returns whether the given object is a number.
 */
isNumber = function (obj) {
    return !isNaN(parseFloat(obj)) && isFinite(obj);
};

/**
 * Return whether the given object (array or dictionary).
 */
isEmpty = function (obj) {
    if (obj == null) {
        return true;
    }
    if (isArray(obj) || isString(obj)) {
        return obj.length === 0;
    }
    for (var key in obj) {
        if (has(obj, key)) {
            return false;
        }
    }
    return true;
};

/**
 * Returns whether the object is an array.
 */
isArray = function (obj) {
    return Object.prototype.toString.call(obj) == '[object Array]';
};

/**
 * Returns an array of the specified size and with each entry set to the given value.
 * @param size
 * @param value
 * @returns {Array}
 */
initArray = function createIdArray(size, value) {
    var array = [];
    for (var i = 0; i < size; ++i) {
        array[i] = value;
    }
    return array;
}

/**
 * Returns an integer within the given bounds.
 * @param lower The inclusive lower bound.
 * @param upper The exclusive upper bound.
 * @returns {number}
 */
randomInteger = function (lower, upper) {
    return parseInt(Math.floor(Math.random() * upper) + lower);
};

/*-------------------Array Extensions ----------------------------*/

if (!Array.prototype.any) {
    Array.prototype.any = function (predicate, thisRef) {
        for (var i = 0; i < this.length; ++i) {
            if (predicate.call(thisRef, this[i])) {
                return this[i];
            }
        }
        return null;
    }
}

if (!Array.prototype.remove) {
    Array.prototype.remove = function () {
        var what, a = arguments, L = a.length, ax;
        while (L && this.length) {
            what = a[--L];
            while ((ax = this.indexOf(what)) !== -1) {
                this.splice(ax, 1);
            }
        }
        return this;
    }
}

if (!Array.prototype.flatten) {
    Array.prototype.flatten = function () {
        return Array.prototype.concat.apply([], this);
    };
}

if (!Array.prototype.distinct) {
    Array.prototype.distinct = function () {
        var a = this;
        var r = [];
        for (var i = 0; i < a.length; i++) {
            if (r.indexOf(a[i]) < 0) {
                r.push(a[i]);
            }
        }
        return r;
    };
}

if (!Array.prototype.contains) {
    Array.prototype.contains = function (obj) {
        var i = this.length;
        while (i--) {
            if (this[i] == obj) {
                return true;
            }
        }
        return false;
    };
}

if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (element) {
        for (var i = 0; i < this.length; ++i) {
            if (this[i] === element) {
                return i;
            }
        }
        return -1;
    }
}

if (!Array.prototype.forEach) {
    Array.prototype.forEach = function (predicate, thisRef) {
        var result = [];
        for (var i = 0; i < this.length; ++i) {
            if (predicate.call(thisRef, this[i])) {
                result.push(this[i]);
            }
        }
        return result;
    }
}

if (!Array.prototype.each) {
    Array.prototype.each = Array.prototype.forEach;
}

if (!Array.prototype.map) {
    /**
     Maps the given functional to each element of the array. See also the 'apply' method which accepts in addition some parameters.
     */
    Array.prototype.map = function (iterator, context) {
        var results = [];
        this.forEach(function (value, index, list) {
            results.push(iterator.call(context, value, index, list));
        });
        return results;
    };
}

if (!Array.prototype.reduce) {
    Array.prototype.reduce = function (iterator, acc, context) {
        var initial = arguments.length > 1;
        this.forEach(function (value, index, list) {
            if (!initial) {
                acc = value;
                initial = true;
            }
            else {
                acc = iterator.call(context, acc, value, index, list);
            }
        });
        if (!initial) {
            throw 'Reduce of empty array with no initial value';
        }
        return acc;
    }
}

if (!Array.prototype.fold) {
    Array.prototype.fold = Array.prototype.reduce;
}

if (!Array.prototype.foldl) {
    Array.prototype.foldl = Array.prototype.reduce;
} // aka fold left

if (!Array.prototype.sameAs) {
    Array.prototype.sameAs = function (array) {
        if (!array) {
            return false;
        }
        if (this.length != array.length) {
            return false;
        }
        for (var i = 0; i < this.length; i++) {
            if (this[i] instanceof Array && array[i] instanceof Array) {
                if (!this[i].compare(array[i])) {
                    return false;
                }
            }
            else if (this[i] != array[i]) {
                // Warning - two different object instances will never be equal: {x:20} != {x:20}
                return false;
            }
        }
        return true;
    }
}

if (!Array.prototype.find) {
    Array.prototype.find = function (iterator, context) {
        var result;
        this.any(function (value, index, list) {
            if (iterator.call(context, value, index, list)) {
                result = value;
                return true;
            }
            return false;
        });
        return result;
    };
}

if (!Array.prototype.first) {
    Array.prototype.first = function (constraint, context) {
        if (this.length == 0) {
            return null;
        }
        if (isUndefined(constraint)) {
            return this[0];
        }
        else {
            for (var i = 0; i < this.length; i++) {
                var item = this[i];
                if (constraint.call(context, item, i, this)) {
                    return item;
                }
            }
            return null;
        }
    }
}

if (!Array.prototype.insert) {

    /**
     * Inserts the given element at the specified position and returns the result.
     */
    Array.prototype.insert = function (element, position) {
        this.splice(position, 0, element);
        return this;
    };
}

if (!Array.prototype.prepend) {
    /**
     * Inserts the given item at begin of array.
     */
    Array.prototype.prepend = function () {
        this.unshift.apply(this, arguments); // tricky way to prepend any number of arguments. by Niko :)
        // this.splice(0, 0, x);
        return this;
    };
}

if (!Array.prototype.append) {
    Array.prototype.append = function (x) {
        this.splice(this.length, 0, x);
        return this;
    };
}

if (!Array.prototype.apply) {
    Array.prototype.apply = function (method) {
        var args = Array.prototype.slice.call(arguments, 1).prepend(0);  // dummy holder at first position to replace in apply below
        var isFunc = isFunction(method);
        return this.map(function (value) {
            args.splice(0, 1, value);
            return (isFunc ? method : value[method]).apply(method, args);
        });
    }
}

if (!Array.prototype.filter) {
    Array.prototype.filter = function (iterator, context) {
        var results = [];
        this.forEach(function (value, index, list) {
            if (iterator.call(context, value, index, list)) {
                results.push(value);
            }
        });
        return results;
    };
}

if (!Array.prototype.select) {
    Array.prototype.select = Array.prototype.filter;
}

if (!Array.prototype.where) {
    Array.prototype.where = function (constraint, first) {
        if (isUndefined(constraint)) {
            return first ? void 0 : [];
        }
        return first ? this.first(constraint) : this.filter(constraint);
    };
}

if (!Array.prototype.add) {
    Array.prototype.add = Array.prototype.push;
}

if (!Array.prototype.isEmpty) {
    Array.prototype.isEmpty = function () {
        return this.length == 0;
    }
}

if (!Array.prototype.all) {
    Array.prototype.all = function (iterator, context) {
        var result = true;
        this.forEach(function (value, index, list) {
            if (!(result = result && iterator.call(context, value, index, list))) {
                return {};
            }
        });
        return !!result;
    }
}

if (!Array.prototype.every) {
    Array.prototype.every = Array.prototype.all;
}

if (!Array.prototype.shuffle) {
    /**
     * Shuffles the elements of this array in a random order.
     */
    Array.prototype.shuffle = function () {
        this.sort(function () {
            return 0.5 - Math.random();
        })
    }
}

if (!Array.prototype.clear) {

    //why not just setting the variable to []? It causes problems if used as byref argument; it will be another object than the one passed.
    Array.prototype.clear = function () {
        while (this.length > 0) {
            this.pop();
        }
    }
}

if (!Array.prototype.bisort) {

    /**
     * Sort the arrays on the basis of the first one (considered as keys and the other array as values).
     * @param a
     * @param b
     * @param sortfunc (optiona) sorting function for the values in the first array
     */
    Array.prototype.bisort = function (a, b, sortfunc) {
        if (isUndefined(a)) {
            throw "First array is not specified.";
        }
        if (isUndefined(b)) {
            throw "Second array is not specified.";
        }
        if (a.length != b.length) {
            throw "The two arrays should have equal length";
        }

        var all = [];

        var sort_by = function (field, reverse, primer) {

            var key = function (x) {
                return primer ? primer(x[field]) : x[field]
            };

            return function (a, b) {
                var A = key(a), B = key(b);
                return ((A < B) ? -1 : (A > B) ? +1 : 0) * [-1, 1][+!!reverse];
            }
        }

        for (var i = 0; i < a.length; i++) {
            all.push({ 'x': a[i], 'y': b[i] });
        }
        if (isUndefined(sortfunc)) {
            all.sort(function (m, n) {
                return m.x - n.x;
            });
        }
        else {
            all.sort(function (m, n) {
                return sortfunc(m.x, n.x);
            });
        }

        a.clear(); // do not set to [], the ref will be gone
        b.clear();

        for (var i = 0; i < all.length; i++) {
            a.push(all[i].x);
            b.push(all[i].y);
        }
    }
}

if (!Array.prototype.addRange) {

    Array.prototype.addRange = function (range) {
        for (var i = 0; i < range.length; i++) {
            this.push(range[i]);
        }
    }
}