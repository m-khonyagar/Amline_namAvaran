import time
import logging

# Setting up logging
logging.basicConfig(level=logging.INFO)

class StateMachineError(Exception):
    pass

class StateMachine:
    def __init__(self):
        self.states = {
            'INITIAL': self.initial_state,
            'STATE_1': self.state_1,
            'STATE_2': self.state_2,
            # ... other states
            'STATE_20': self.state_20,
        }
        
        self.current_state = 'INITIAL'
        self.sla_tracker = {}  # Example of SLA tracking
        
def transition(self, event):
        try:
            next_state = self.states[self.current_state].get(event)
            if next_state:
                self.current_state = next_state
                self.log_state_change(event)
            else:
                raise StateMachineError(f"No transition for event {event} in state {self.current_state}")
        except Exception as e:
            logging.error(f"Error during transition: {e}")
            self.handle_error(e)
    
    def log_state_change(self, event):
        logging.info(f"Transitioning from {self.current_state} on event {event}")
        self.sla_tracker[self.current_state] = time.time()
    
    # State methods
    def initial_state(self):
        return {'START_EVENT': 'STATE_1'}  # Transitions from INITIAL to STATE_1

    def state_1(self):
        return {'EVENT_1': 'STATE_2', 'EVENT_2': 'STATE_3'}

    def state_2(self):
        # Define transitions for STATE_2
        return {'EVENT_3': 'STATE_4'}

    # ... Add all other states similarly ...

    def state_20(self):
        return {}  # No outgoing transitions

    def handle_error(self, error):
        logging.error(f"Handling error: {error}")

# Example usage
if __name__ == "__main__":
    sm = StateMachine()
    sm.transition('START_EVENT')
    sm.transition('EVENT_1')