# <img src="https://github.com/grownjs/jamrock-guide/raw/master/docs/images/jamrock.svg" alt="Jamrock" />

> [!IMPORTANT]
> WIP: development in progress, stuff shall change!

## What is Jamrock?

It's a SSR framework for Javascript (NodeJS, Deno & Bun)

You can preview the initial version of our website at https://jamrock.dev (ain't much but is honest work!)

I've been working on this shit for a short while, learning a lot while stealing ideas like real-artists&trade;. I am planning to release something usable next year, limited on features, but easy to grasp and extend!

I don't want to compete with a vast and wild world of kick-ass technologies... so far, I want to limit what am planning for it.

- [x] Components &mdash; a bit of them, based on Svelte 5 syntax but using old `export` style props!
- [x] Fragments &mdash; not yet finished, but they are meant for updateable nodes on the browser.
- [x] Snippets &mdash; yes! well, not so advanced but for most basic usage they just work.
- [x] Layouts &mdash; support for `+layout` or `+error` components is built-in, nested component rendering is also handled this way.
- [ ] Scripts &mdash; you can actually embed scripts for client-side usage, or bundle them... something in between!
- [x] Styles &mdash; scoped css for sure, even we have some basic integration with UnoCSS to have fun.
- [x] Pages &mdash; this is all we wanted, declare routes and api endpoints through page components.
- [x] APIs &mdash; support for `+server` modules (middleware) is enabled, along with all your pages.
- [ ] Data &mdash; what? Yeah, you can render almost from anything but what if we could understand some data-types like a generator? And, in turn, update the DOM whenever the generator yield new values!
- [ ] E2E &mdash; I would like but front-end is very complicated… so I don’t want to replicate what we already have. However, a plain integration shall be available soon!
- [ ] DX &mdash; not yet done, but we provide a CLI with enough power to watch and update your app live (it lacks of HMR and nice things, but it helps).
- [ ] Support &mdash; I am testing everything against NodeJS, Deno and Bun so I think we'll be fine. If everything goes well, we could also run on jsdom/happy-dom/somedom contexts for headless testing.

There are lots of things still floating around, other stuff commented, and we're plenty of broken shit. I you want to stuck in this mud you're already on board!

## What branches are usable?

We have no special branches or tags yet, but we have few commits with squashed work over iterations I made.

You can compare between them to feel the pain, and if you're enough brave you can try to run the tests locally... fortunately, we have some actions running against the `next` branch to keep the stuff green.

> [!NOTE]
> I'll be using the `next` branch as for tinkering and make some progress, while the `master` branch will keep the final changes.
