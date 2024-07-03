import { CompilerPass, ContainerBuilder, Definition,Reference, PriorityTaggedService, ServiceClosureArgument } from '@raegon/dependency-injection';
import Emittery from 'emittery';


function array_flip(target: object){
    return Object.entries(target).reduce((obj: any, [key,value]) =>({...obj, [value]: key}),{});
}

export class RegisterListenersPass implements CompilerPass
{
    protected dispatcherService: any;
    protected listenerTag: string;
    protected subscriberTag: string;
    protected eventAliasesParameter: any;

    private hotPathEvents = [];
    private hotPathTagName = 'container.hot_path';
    private noPreloadEvents = [];
    private noPreloadTagName = 'container.no_preload';

    public  constructor(dispatcherService = 'event_dispatcher', listenerTag = 'kernel.event_listener', subscriberTag = 'kernel.event_subscriber', eventAliasesParameter = 'event_dispatcher.event_aliases')
    {
        if (0 < arguments.length) {
            console.warn('@raegon/kernel', '5.3', `Configuring "${this.constructor.name}" is deprecated.`);
        }

        this.dispatcherService = dispatcherService;
        this.listenerTag = listenerTag;
        this.subscriberTag = subscriberTag;
        this.eventAliasesParameter = eventAliasesParameter;
    }

    /**
     * @return this
     */
    public  setHotPathEvents(hotPathEvents: {[i: string]: string})
    {
        this.hotPathEvents = Object.entries(hotPathEvents).reduce((obj: any, [key,value]) =>({...obj, [value]: key}),{});

        if (1 < arguments.length) {
            console.warn('raegon/event-dispatcher', '5.4', `Configuring "tagName" in "${this.constructor.name}" is deprecated.`);
            this.hotPathTagName = arguments[1];
        }

        return this;
    }

    /**
     * @return this
     */
    public  setNoPreloadEvents(noPreloadEvents: string[])
    {
        this.noPreloadEvents = array_flip(noPreloadEvents);

        if (1 < arguments.length) {
            console.warn('@raegon/kernel', '5.4', `Configuring "tagName" in "${this.constructor.name}.setNoPreloadEvents" is deprecated.`,'' );
            this.noPreloadTagName = arguments[1];
        }

        return this;
    }

    public  process(container: ContainerBuilder)
    {
        if (!container.hasDefinition(this.dispatcherService) && !container.hasAlias(this.dispatcherService)) {
            return;
        }

        var aliases:{[i:string]: any} = {};

        if (container.hasParameter(this.eventAliasesParameter)) {
            aliases = container.getParameter(this.eventAliasesParameter);
        }

        const globalDispatcherDefinition = <Definition>container.findDefinition(this.dispatcherService);


        const targedServices = container.findTaggedServiceIds(this.listenerTag, true);


        // console.log('looking for: ', this.listenerTag, 'found: ', targedServices);


        for(const id in targedServices) {

            const events = targedServices[id];

            var noPreload = 0;

            for (const event of events) {
                var priority = event['priority'] ?? 0;

                if (! ('event' in event)) {
                    if (container.getDefinition(id).hasTag(this.subscriberTag)) {
                        continue;
                    }

                    event['method'] = event['method'] ?? 'handle';//'__invoke';
                    event['event'] = this.getEventFromTypeDeclaration(container, id, event['method']);
                }

                event['event'] = aliases[event['event']] ?? event['event'];

                //PAY ATTENSION HERE
                // if (!('method' in event)) {

                //     event['method'] = 'on' + preg_replace_callback([
                //         '/(?<=\b|_)[a-z]/i',
                //         '/[^a-z0-9]/i',
                //     ],  function(matches) { return strtoupper(matches[0]); }, event['event']);
                //     event['method'] = preg_replace('/[^a-z0-9]/i', '', event['method']);

                //     if (null !== (class = container.getDefinition(id).getClass()) && (r = container.getReflectionClass(class, false)) && !r.hasMethod(event['method']) && r.hasMethod('__invoke')) {
                //         event['method'] = '__invoke';
                //     }
                // }

                var dispatcherDefinition = globalDispatcherDefinition;

                if (('dispatcher' in event)) {
                    dispatcherDefinition = container.getDefinition(event['dispatcher']);
                }

                dispatcherDefinition.addMethodCall('addListener', [event['event'], new ServiceClosureArgument(new Reference(id),event['method']?? 'call'), priority]);

                if (event['event'] in (this.hotPathEvents)) {
                    container.getDefinition(id).addTag(this.hotPathTagName);
                }
                else
                if ((event['event'] in this.noPreloadEvents)) {
                    ++noPreload;
                }
            }

            if (noPreload && (events.length) === noPreload) {
                container.getDefinition(id).addTag(this.noPreloadTagName);
            }
        }

        // const extractingDispatcher = new Emittery();

        // const services = container.findTaggedServiceIds(this.subscriberTag, true);

        // for (const id in services) {
        //     const tags = services[id];

        //     const def = container.getDefinition(id);

        //     // We must assume that the class value has been correctly filled, even if the service is created by a factory
        //     const serviceClass = def.getClass();

        //     // if (!r = container.getReflectionClass(class)) {
        //     //     throw new InvalidArgumentException(sprintf('Class "%s" used for service "%s" cannot be found.', class, id));
        //     // }
        //     // if (!r.isSubclassOf(EventSubscriberInterface::class)) {
        //     //     throw new InvalidArgumentException(sprintf('Service "%s" must implement interface "%s".', id, EventSubscriberInterface::class));
        //     // }
        //     // serviceClass = r.name;

        //     var dispatcherDefinitions: {[i:string]: Definition} = {};
        //     for (const attributes of tags) {
        //         if (!('dispatcher' in attributes) ||  (attributes['dispatcher'] in dispatcherDefinitions)) {
        //             continue;
        //         }

        //         dispatcherDefinitions[attributes['dispatcher']] = container.getDefinition(attributes['dispatcher']);
        //     }

        //     if (!dispatcherDefinitions) {
        //         dispatcherDefinitions = [globalDispatcherDefinition];
        //     }

        //     noPreload = 0;
        //     // ExtractingEventDispatcher.aliases = aliases;
        //     // ExtractingEventDispatcher.subscriber = class;
        //     extractingDispatcher.addSubscriber(extractingDispatcher);

        //     for(const args:any[] of extractingDispatcher.listeners) {

        //         args[1] = [new ServiceClosureArgument(new Reference(id)), args[1]];

        //         for(const key in dispatcherDefinitions) {
        //             const dispatcherDefinition = dispatcherDefinitions[key];
        //             dispatcherDefinition.addMethodCall('addListener', args);
        //         }

        //         if ((args[0] in this.hotPathEvents)) {
        //             container.getDefinition(id).addTag(this.hotPathTagName);
        //         }
        //         else
        //         if ((args[0] in this.noPreloadEvents)) {
        //             ++noPreload;
        //         }
        //     }
        //     if (noPreload && Object.entries(extractingDispatcher.listeners).length === noPreload) {
        //         container.getDefinition(id).addTag(this.noPreloadTagName);
        //     }
        //     extractingDispatcher.listeners = [];
        //     // ExtractingEventDispatcher.aliases = [];
        // }
    }


    private  getEventFromTypeDeclaration(container: ContainerBuilder, id: string, method: string): string
    {
        return method;
        throw new Error('getEventFromTypeDeclaration not supported')
        // if (
        //     null === (class = container.getDefinition(id).getClass())
        //     || !(r = container.getReflectionClass(class, false))
        //     || !r.hasMethod(method)
        //     || 1 > (m = r.getMethod(method)).getNumberOfParameters()
        //     || !(type = m.getParameters()[0].getType()) instanceof \ReflectionNamedType
        //     || type.isBuiltin()
        //     || Event::class === (name = type.getName())
        // ) {
        //     throw new InvalidArgumentException(sprintf('Service "%s" must define the "event" attribute on "%s" tags.', id, this.listenerTag));
        // }

        // return name;
    }
}

// /**
//  * @internal
//  */
// class ExtractingEventDispatcher extends EventDispatcher implements EventSubscriberInterface
// {
//     public listeners = [];

//     public static aliases = [];
//     public static subscriber;

//     public  addListener(string eventName, listener, int priority = 0)
//     {
//         this.listeners[] = [eventName, listener[1], priority];
//     }

//     public static  getSubscribedEvents(): array
//     {
//         events = [];

//         foreach ([self::subscriber, 'getSubscribedEvents']() as eventName => params) {
//             events[self::aliases[eventName] ?? eventName] = params;
//         }

//         return events;
//     }
// }


export default RegisterListenersPass;