
import sprintf from 'locutus/php/strings/sprintf';
import substr from 'locutus/php/strings/substr';
import { InvalidArgumentException, RuntimeException } from '../../dependency-injection/src/Container';
import Bundle from './Bundle';
import { RegisterListenersPass } from './DependencyInjection/Compiler/RegisterListenersPass';
import { Container, ContainerBuilder, Extension, MergeExtensionConfigurationPass } from '@raegon/dependency-injection';

import * as H from '@raegon/event-dispatcher';
import { PassHookPoint } from '@raegon/dependency-injection';
const EmitteryEventDispatcher = (<any>H).EmitteryEventDispatcher;


export type BundleConstructor = new() => Bundle;

export class Kernel {

    public static readonly VERSION = '5.4.10';
    public static readonly VERSION_ID = 50410;
    public static readonly MAJOR_VERSION = 5;
    public static readonly MINOR_VERSION = 4;
    public static readonly RELEASE_VERSION = 10;
    public static readonly EXTRA_VERSION = '';
    public static readonly END_OF_MAINTENANCE = '11/2024';
    public static readonly END_OF_LIFE = '11/2025';
    /**
     * @var array<string, bool>
     */
     private static freshCache = [];

    /**
     * @var array<string, BundleInterface>
     */
    protected bundles =  new Map<string,Bundle>();

    protected bundlesFactories: { [i:string]: BundleConstructor } = {};

    protected enabledBundles: { [i: string]: boolean} = {};
 
    protected container: Container = null as any;
    protected environment: string;
    protected debug = (('process' in window)? process : null)?.env.NODE_ENV === 'development';
    protected booted = false;
    protected startTime: Date = null as any;

    private projectDir!: string;
    private warmupDir?: string;
    private requestStackSize = 0;
    private resetServices = false;



    public constructor(environment: string,debug: boolean) {
        // tslint:disable-next-line:no-conditional-assignment
        if (!(this.environment = environment)) {
            throw new InvalidArgumentException(sprintf('Invalid environment provided to "%s": the environment cannot be empty.', typeof(this)));
        }

        this.debug = debug;
    }

    public clone() {
        this.booted = false;
        this.container = null as any;
        this.requestStackSize = 0;
        this.resetServices = false;
    }

    /**
     * {@inheritdoc}
     */
    public async boot() {
        if (true === this.booted) {
            if (!this.requestStackSize && this.resetServices) {
                if (this.container && this.container.has('services_resetter')) {
                    this.container.get('services_resetter').reset();
                }
                this.resetServices = false;
                if (this.debug) {
                    this.startTime = new Date();
                }
            }

            return;
        }


        if (null === this.container) {
            await this.preBoot();
        }
        // await this.registerBundles();


        const bundles = this.getBundles();

        const bootingPromises: Promise<void>[] = [];

        let i = 0;
        for(const name of bundles.keys()) {
            i++;
            const bundle = bundles.get(name) as Bundle;
            bundle.setContainer(this.container as Container);
            const result = bundle.boot();

            if(result instanceof Promise)
                bootingPromises.push(result);
        }

        await Promise.all(bootingPromises);

        this.booted = true;
    }

    /**
     * {@inheritdoc}
     */
    public reboot(warmupDir?: string) {
        this.shutdown();
        this.warmupDir = warmupDir;
        this.boot();
    }

    // /**
    //  * {@inheritdoc}
    //  */
    // // public terminate(Request request, Response response)
    // public terminate(request,response)
    // {
    //     if (false === this.booted) {
    //         return;
    //     }

    //     // if (this.getHttpKernel() instanceof TerminableInterface) {
    //     //     this.getHttpKernel().terminate(request, response);
    //     // }
    // }

    /**
     * {@inheritdoc}
     */
    public shutdown() {
        if (false === this.booted) {
            return;
        }

        this.booted = false;

        const bundles = this.getBundles();

        for(const name in bundles) {
            const bundle = bundles.get(name) as Bundle;
            bundle.shutdown();
            bundle.setContainer(null as any as Container);
        }

        this.container = null as any;
        this.requestStackSize = 0;
        this.resetServices = false;
    }

    // /**
    //  * {@inheritdoc}
    // //  */
    // // public handle(Request request, int type = HttpKernelInterface::MAIN_REQUEST, bool catch = true)
    // public handle(request, type = null as any, _catch = true)
    // {
    //     // if (!this.booted) {
    //     //     container = this.container ?? this.preBoot();

    //     //     if (container.has('http_cache')) {
    //     //         return container.get('http_cache').handle(request, type, catch);
    //     //     }
    //     // }

    //     // this.boot();
    //     // ++this.requestStackSize;
    //     // this.resetServices = true;

    //     // try {
    //     //     return this.getHttpKernel().handle(request, type, catch);
    //     // } finally {
    //     //     --this.requestStackSize;
    //     // }
    // }

    /**
     * Gets an HTTP kernel from the container.
     *
     * @return HttpKernelInterface
     */
    // protected getHttpKernel()
    // {
    //     return this.container.get('http_kernel');
    // }

    /**
     * {@inheritdoc}
     */
    public getBundles() {
        return this.bundles;
    }

    /**
     * {@inheritdoc}
     */
    public getBundle(name: string) {
        if (this.bundles.has(name)) {
            throw new InvalidArgumentException(sprintf('Bundle "%s" does not exist or it is not enabled. Maybe you forgot to add it in the "registerBundles()" method of your "%s.php" file?', name, typeof(this)));
        }

        return this.bundles.get(name) as Bundle;
    }

    /**
     * {@inheritdoc}
     */
    public locateResource(name: string) {
        if ('@' !== name[0]) {
            throw new InvalidArgumentException(sprintf('A resource name must start with @ ("%s" given).', name));
        }

        if (name.includes('..')) {
            throw new RuntimeException(sprintf('File name "%s" contains invalid characters (..).', name));
        }

        let bundleName: string = substr(name, 1);
        let path = '';

        if (bundleName.includes('/')) {
            [bundleName, path] = bundleName.split('/',2);
        }

        const bundle = this.getBundle(bundleName);

        // if (file_exists(file = bundle.getPath().'/'.path)) {
        //     return file;
        // }

        throw new InvalidArgumentException(sprintf('Unable to find file "%s".', name));
    }

    /**
     * {@inheritdoc}
     */
    public getEnvironment() {
        return this.environment;
    }

    /**
     * {@inheritdoc}
     */
    public isDebug() {
        return this.debug;
    }

    /**
     * Gets the application root dir (path of the project's composer file).
     *
     * @return string
     */
    public getProjectDir(): string {
        return location.hostname;
    }

    /**
     * {@inheritdoc}
     */
    public getContainer() {
        if (!this.container) {
            throw new RuntimeException('Cannot retrieve the container from a non-booted kernel.');
        }

        return this.container;
    }

    /**
     * @internal
     */
    // tslint:disable-next-line:ban-types
    public setAnnotatedClassCache(annotatedClasses: Function[]): void {}

    /**
     * {@inheritdoc}
     */
    public getStartTime(): Date|null {
        return (this.debug && null !== this.startTime) ? this.startTime : null;
    }

    /**
     * {@inheritdoc}
     */
    public getCacheDir() {
        return this.getProjectDir() + '/var/cache/' + this.environment;
    }

    /**
     * {@inheritdoc}
     */
    public getBuildDir(): string {
        // Returns this.getCacheDir() for backward compatibility
        return this.getCacheDir();
    }

    /**
     * {@inheritdoc}
     */
    public getLogDir() {
        return this.getProjectDir() + '/var/log';
    }

    /**
     * {@inheritdoc}
     */
    public getCharset() {
        return 'UTF-8';
    }

    /**
     * Gets the patterns defining the classes to parse and cache for annotations.
     */
    public getAnnotatedClassesToCompile(): Function[] {
        return [];
    }

    // DON'T DELETE THIS

    //   /**
    //    * {@inheritdoc}
    //    */
    //   public async  *registerBundles()
    //   {
    //       const contents = <{[i:string]:(boolean|{[i:string]: boolean})}> await import(/* webpackIgnore: true */this.getBundlesPath());
    //       for(const bundleModule in contents) {
    //             const envs = contents[bundleModule];

    //           if ( ((typeof(envs) === 'boolean') || envs[this.environment]) ?? envs['all'] ?? false) {
    //             const Bundle = <Function>await import( /* webpackIgnore: true*/bundleModule);
    //               yield Reflect.construct(Bundle,[]);
    //           }
    //       }
    //   }


    public addBundle(name: string|BundleConstructor, constructor?: BundleConstructor, enabled = true){
        if(!constructor){
            if(typeof(name) !== 'function')
                throw new Error("Invalid Bundle Data");
            constructor = name;
            name = constructor.name;
        }

        if(typeof(name) !== 'string')
            throw new Error('Bundle name can only be string');

        this.bundlesFactories[name] = constructor;
        this.enabledBundles[name] = enabled;
    }


      /**
       * {@inheritdoc}
       */
     public async  *registerBundles() {
         

        //  console.log('bundles: ', bundles);

        //  const contents = {
        //     'ui-bundle': true,
        //     'persona-bundle': true,
        //   } as {[i: string]: (boolean|{[i: string]: boolean})};

         let enabled = false;

         for (const bundleModule in this.enabledBundles) {
               const envs = this.enabledBundles[bundleModule] as any;

               if ( enabled =  ((typeof(envs) === 'boolean') && envs === true) || ((typeof(envs) === 'object') && (envs[this.environment] ?? envs?.all ?? false))) {
               const Bundle = this.bundlesFactories[bundleModule];
            // const Bundle = await bundles[(bundleModule)];

               yield Reflect.construct(Bundle, []);
             } else {
                // console.log('disabled Bundle: ',);
             }
         }
     }

      /**
       * {@inheritdoc}
       */
      public  registerContainerConfiguration(container: ContainerBuilder) {


        if (!container.hasDefinition('kernel')) {
            container.register('kernel', Kernel)
                .addTag('controller.service_arguments')
                .setAutoconfigured(true)
                .setSynthetic(true)
                .setPublic(true)
            ;


      }

      }

    // abstract registerBundles():{[i:string]: Bundle};

    /**
     * Initializes bundles.
     *
     * @throws \LogicException if two bundles share a common name
     */
    protected async initializeBundles() {
        // init bundles

        // this.bundles = {};

        const bundles = this.registerBundles();

        for await(const bundle of  bundles) {
            // const bundle = await bundles[<any>key];
            const name = bundle.getName();

            if ((this.bundles.has(name))) {
                throw new RuntimeException(sprintf('Trying to register two bundles with the same name "%s".', name));
            }
            this.bundles.set(name, bundle);
        }
    }

    /**
     * The extension point similar to the Bundle::build() method.
     *
     * Use this method to register compiler passes and manipulate the container during the building process.
     */
    // tslint:disable-next-line:no-empty
    protected build(container: ContainerBuilder) {

    }

    /**
     * Gets the container class.
     *
     * @throws \InvalidArgumentException If the generated classname is invalid
     *
     * @return string
     */
    // tslint:disable-next-line:ban-types
    protected getContainerClass(): Function {

        return Container;
    }


    protected getContainerBaseClass() {
        return 'Container';
    }

    /**
     * Initializes the service container.
     *
     * The built version of the service container is used when fresh, otherwise the
     * container is built.
     */
    protected async initializeContainer() {
        const containerClass = this.getContainerClass();

        const buildDir = this.warmupDir ?? this.getBuildDir();

        try {
            let container: ContainerBuilder = null as any;
            container = this.buildContainer();

            container.set('kernel', this);

            this.container = container;

            container.compile();
            // this.container.set('kernel', this);
        } catch (e) {
            throw e;
        }
    }

    private initializeEventDispatcher(container: ContainerBuilder){
                
        const name = 'kernel:' + this.environment + ':emitter';
            
        // const emitter = new Emittery();

        container.register('kernel.event_dispatcher',EmitteryEventDispatcher)
                    .addArgument({debug:{ name,  enabled: this.debug}})
                        .setPublic(true);

        
            container.addCompilerPass(new RegisterListenersPass('kernel.event_dispatcher'),PassHookPoint.BEFORE_OPTIMIZATION,-100000);
    }

    /**
     * Returns the kernel parameters.
     *
     * @return array
     */
    protected getKernelParameters() {
        const bundles: {[i: string]: Bundle} = {};
        const bundlesMetadata: {[i: string]: {path: string, namespace: string}} = {};

        for (const name of  this.bundles.keys()) {
            const bundle = this.bundles.get(name) as Bundle;
            bundles[name] = bundle;
            bundlesMetadata[name] = {
                path: bundle.getPath(),
                namespace: bundle.getNamespace(),
            };
        }

        return {
            'kernel.project_dir': (this.getProjectDir()),
            'kernel.environment': this.environment,
            'kernel.runtime_environment': '%env(default:kernel.environment:APP_RUNTIME_ENV)%',
            'kernel.debug': this.debug,
            // 'kernel.build_dir' => realpath(buildDir = this.warmupDir ?: this.getBuildDir()) ?: buildDir,
            // 'kernel.cache_dir' => realpath(cacheDir = (this.getCacheDir() === this.getBuildDir() ? (this.warmupDir ?: this.getCacheDir()) : this.getCacheDir())) ?: cacheDir,
            // 'kernel.logs_dir' => realpath(this.getLogDir()) ?: this.getLogDir(),
            'kernel.bundles': bundles,
            'kernel.bundles_metadata': bundlesMetadata,
            'kernel.charset': this.getCharset(),
            'kernel.container_class': this.getContainerClass(),
        };
    }

    /**
     * Builds the service container.
     *
     * @return ContainerBuilder
     *
     * @throws \RuntimeException
     */
    protected buildContainer() {

        const container = this.getContainerBuilder();
        container.addObjectResource(this);
        
        this.initializeEventDispatcher(container);
        this.prepareContainer(container);


        return container;
    }

    /**
     * Prepares the ContainerBuilder before it is compiled.
     */
    protected prepareContainer(container: ContainerBuilder) {
        const extensions: string[] = [];
        let extension: Extension|null;

        for (const key of this.bundles.keys()) {
            const bundle = this.bundles.get(key) as Bundle;

            // tslint:disable-next-line:no-conditional-assignment
            if (extension = bundle.getContainerExtension()) {
                container.registerExtension(extension);
            }

            if (this.debug) {
                container.addObjectResource(bundle);
            }
        }

        for (const key of this.bundles.keys()) {
            const bundle = this.bundles.get(key) as Bundle;
            bundle.build(container);
        }

        this.build(container);


        const localExtensions = container.getExtensions();
        // tslint:disable-next-line:forin
        for (const key in localExtensions) {
            // tslint:disable-next-line:no-shadowed-variable
            const extension = localExtensions[key];
            extensions.push(extension.getAlias());
        }

        // ensure these extensions are implicitly loaded
        container.getCompilerPassConfig().setMergePass(new MergeExtensionConfigurationPass(extensions));
    }

    /**
     * Gets a new ContainerBuilder instance used to build the service container.
     *
     * @return ContainerBuilder
     */
    protected getContainerBuilder(): ContainerBuilder {
        const container = new ContainerBuilder();
        container.getParameterBag().add(this.getKernelParameters());


        return container;
    }


    private async preBoot() {
        if (this.debug) {
            this.startTime = new Date();
        }

        await this.initializeBundles();
        await this.initializeContainer();

        const container = this.container as Container;


        return container;
    }


      /**
       * Gets the path to the configuration directory.
       */
      private  getConfigDir(): string {
        return '';
        //   return this.getProjectDir().'/config';
      }

      /**
       * Gets the path to the bundles configuration file.
       */
      private  getBundlesPath(): string {
          return this.getConfigDir() + '/bundles.json';
      }

}


export default Kernel;
