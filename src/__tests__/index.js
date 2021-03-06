import fs from 'fs';
import http from 'http';
import test from 'ava';
import postcss from 'postcss';
import getPort from 'get-port';
import valueParser from 'postcss-value-parser';
import plugin, {complexGradient, simpleGradient} from '..';

const image = './../../docs/waves.jpg';

function getArguments (node) {
    return node.nodes.reduce((list, child) => {
        if (child.type !== 'div') {
            list[list.length - 1].push(child);
        } else {
            list.push([]);
        }
        return list;
    }, [[]]);
}

function assertColourStops (t, fixture, expected, options) {
    return postcss(plugin(options)).process(fixture).then((result) => {
        valueParser(result.root.first.nodes[0].value).walk(node => {
            if (node.value !== 'linear-gradient') {
                return false;
            }
            t.deepEqual(getArguments(node).slice(1).length, expected);
        });
    });
}

function processCss (t, fixture, expected, options) {
    return postcss(plugin(options)).process(fixture).then(({css}) => {
        t.deepEqual(css, expected);
    });
}

function shouldThrow (t, fixture, options) {
    t.throws(processCss(t, fixture, fixture, options));
}

test('should process images from urls', t => {
    return getPort().then(port => {
        const server = http.createServer((req, res) => {
            res.writeHead(200, {'Content-Type': 'image/jpg'});
            fs.createReadStream(image).pipe(res);
        }).listen(port);

        return assertColourStops(
            t,
            `header{background:resemble-image(url("http://localhost:${port}"), 50%)}`,
            2
        ).then(() => server.close());
    });
});

test(
    'should pass through when it cannot find a resemble-image function',
    processCss,
    `header{background:url("${image}")}`,
    `header{background:url("${image}")}`
);

test(
    'should output a gradient with stops 25% apart (defaults)',
    assertColourStops,
    `header{background:resemble-image(url("${image}"))}`,
    4
);

test(
    'should output a gradient with stops 50% apart',
    assertColourStops,
    `header{background:resemble-image(url("${image}"), 50%)}`,
    2
);

test(
    'should output a gradient with stops 50% apart, with an unquoted url',
    assertColourStops,
    `header{background:resemble-image(url(${image}), 50%)}`,
    2
);

test(
    'should output a gradient with stops 50% apart, using the complex generator',
    assertColourStops,
    `header{background:resemble-image(url("${image}"), 50%)}`,
    3,
    {generator: complexGradient}
);

test(
    'should output a gradient with stops 50% apart, using the simple generator',
    assertColourStops,
    `header{background:resemble-image(url("${image}"), 50%)}`,
    2,
    {generator: simpleGradient}
);

test(
    'should output a gradient with stops 100px apart',
    assertColourStops,
    `header{background:resemble-image(url("${image}"), 100px)}`,
    10
);

test(
    'should output a gradient with stops 100px apart (non-px unit)',
    assertColourStops,
    `header{background:resemble-image(url("${image}"), 100em)}`,
    10
);

test(
    'should output a gradient with stops 100px apart (no unit)',
    assertColourStops,
    `header{background:resemble-image(url("${image}"), 100)}`,
    10
);

test(
    'should output a gradient with stops 100px apart (from options)',
    assertColourStops,
    `header{background:resemble-image(url("${image}"))}`,
    10,
    {fidelity: 100}
);

test(
    'should handle multiple backgrounds',
    assertColourStops,
    `header{background:url("foo.jpg"), resemble-image(url("${image}"))}`,
    4
);

test(
    'should error on 0',
    shouldThrow,
    `header{background:resemble-image(url("${image}"), 0)}`
);

test(
    'should error on 0, when set from options',
    shouldThrow,
    `header{background:resemble-image(url("${image}"))}`,
    {fidelity: 0}
);

test(
    'should error on 0, when set from options (string)',
    shouldThrow,
    `header{background:resemble-image(url("${image}"))}`,
    {fidelity: '0'}
);

test(
    'should error on invalid fidelity',
    shouldThrow,
    `header{background:resemble-image(url("${image}"), twenty-five)}`
);
