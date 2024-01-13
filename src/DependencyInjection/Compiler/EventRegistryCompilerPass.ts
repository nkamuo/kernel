import { CompilerPass, ContainerBuilder, PriorityTaggedService } from '@raegon/dependency-injection';

export default class EventRegistryCompilerPass implements CompilerPass{


    private priorityService = new PriorityTaggedService();
    /**
     * {@inheritdoc}
     */
     public  process(container: ContainerBuilder)
     {
         try {
            //  this.processValue(container.getDefinitions(), true);
            
            const listeners = this.priorityService.findAndSortTaggedServices('emittery.listener', container);

            console.log('Listeners: ', listeners);



         } finally {
         }
     }
    
}